import Foundation
import Capacitor
import StoreKit

/*
 StoreKit 2 billing for iOS, registered as `IgnytBilling` — the SAME plugin name the Android
 side uses, because entitlements.js reaches for window.Capacitor.Plugins.IgnytBilling and must
 not need a per-platform branch to find it.

 THE JSON CONTRACT IS ANDROID'S, NOT APPLE'S. Every key below matches what BillingPlugin.kt
 already returns — plans[], basePlanId, offerToken, price, priceMicros, currency, period,
 hasFreeTrial, trialPeriod, entitled, purchaseToken. The paywall reads those names, so the
 translation from Apple's vocabulary happens HERE rather than leaking a second shape into the
 web layer. Concretely:

   Play base plan   -> a StoreKit Product. Its `id` is reported as basePlanId.
   Play offerToken  -> Apple has no equivalent; introductory offers are applied automatically
                       to eligible accounts. Reported as null, and purchase() ignores it.
   Play priceMicros -> Apple gives a Decimal price; multiplied by 1_000_000 to match.

 WHAT APPLE DOES DIFFERENTLY, and why the paywall still works: an introductory (free trial)
 offer is not something the app selects at purchase time. StoreKit decides eligibility itself
 and applies it. So hasFreeTrial here answers "does this product carry an intro offer AND is
 this account eligible for it" — which is exactly the question the paywall asks before it
 promises a trial, and it is answered by Apple rather than guessed.

 UNVERIFIED AT RUNTIME. This has never executed — there is no Mac in this project's toolchain
 and iOS builds go through Codemagic. It compiles or it does not; whether it BEHAVES is
 unknown until it runs on a device against a StoreKit configuration. paywallApplies() is
 written to detect this plugin rather than assume it, so a build where this is broken or absent
 leaves iOS free rather than locking users out of an app they cannot pay for.
 */
@objc(IgnytBillingPlugin)
public class IgnytBillingPlugin: CAPPlugin {

    /// Matches DEFAULT_PRODUCT in BillingPlugin.kt and PRODUCT_ID in entitlements.js.
    private static let defaultProduct = "ignyt_premium"

    /* Apple sells each duration as its own product; Play sells one product with base plans
       under it. So the single Play id maps to a SET of App Store product ids, and each is
       reported back as a "plan" whose basePlanId is its own product id. Those ids have to be
       created in App Store Connect with exactly these names. */
    private static func appleProductIds(for playProductId: String) -> [String] {
        return ["\(playProductId).monthly", "\(playProductId).yearly"]
    }

    private var updatesTask: Task<Void, Never>?

    override public func load() {
        /* Transactions can arrive when the app is not the one that started them — an Ask to Buy
           approval, a renewal, a purchase made on another device. Unfinished transactions are
           redelivered forever until finish() is called, so this listener is what stops a
           purchase from being retried on every launch. */
        updatesTask = Task.detached { [weak self] in
            for await update in Transaction.updates {
                guard let self = self else { return }
                if case .verified(let transaction) = update {
                    await transaction.finish()
                    self.notifyListeners("entitlementChanged", data: ["productId": transaction.productID])
                }
            }
        }
    }

    deinit { updatesTask?.cancel() }

    // MARK: - getProducts

    @objc func getProducts(_ call: CAPPluginCall) {
        let playId = call.getString("productId") ?? Self.defaultProduct
        Task {
            do {
                let products = try await Product.products(for: Self.appleProductIds(for: playId))
                var plans: [[String: Any]] = []
                for p in products {
                    guard let sub = p.subscription else { continue }

                    /* Eligibility is asked of StoreKit, not inferred from the offer existing.
                       An account that already used the intro offer is not eligible, and telling
                       the paywall otherwise would promise a trial Apple will not honour — the
                       single most common paywall complaint. */
                    var hasTrial = false
                    var trialPeriod = ""
                    if let intro = sub.introductoryOffer, intro.paymentMode == .freeTrial {
                        hasTrial = await sub.isEligibleForIntroOffer
                        if hasTrial { trialPeriod = Self.iso8601(intro.period) }
                    }

                    plans.append([
                        "basePlanId": p.id,
                        "offerId": hasTrial ? "introductory" : NSNull(),
                        // Apple applies intro offers itself; there is no token to pass back.
                        "offerToken": NSNull(),
                        "price": p.displayPrice,
                        "priceMicros": NSDecimalNumber(decimal: p.price * 1_000_000).int64Value,
                        "currency": p.priceFormatStyle.currencyCode,
                        "period": Self.iso8601(sub.subscriptionPeriod),
                        "hasFreeTrial": hasTrial,
                        "trialPeriod": trialPeriod
                    ])
                }
                if plans.isEmpty {
                    // Same shape the web layer already handles: a clean failure, not an empty success.
                    call.resolve(["success": false, "error": "No subscriptions available on this account."])
                    return
                }
                call.resolve(["success": true, "data": ["productId": playId, "title": "IGNYT Premium", "plans": plans]])
            } catch {
                call.resolve(["success": false, "error": "Could not load plans: \(error.localizedDescription)"])
            }
        }
    }

    // MARK: - getEntitlement

    @objc func getEntitlement(_ call: CAPPluginCall) {
        let playId = call.getString("productId") ?? Self.defaultProduct
        Task {
            let ids = Set(Self.appleProductIds(for: playId))
            var entitled = false
            var count = 0
            var token: Any = NSNull()

            /* currentEntitlements is the live set — it excludes expired and refunded purchases,
               which is why this is not a scan of Transaction.all. An unverified result is
               treated as NOT entitled: a failed signature check is exactly the case where
               trusting the transaction would be the bug. */
            for await result in Transaction.currentEntitlements {
                guard case .verified(let t) = result, ids.contains(t.productID) else { continue }
                if t.revocationDate != nil { continue }
                entitled = true
                count += 1
                /* The JWS representation, which is what a server verifies. Named purchaseToken
                   to match Android so the backend receives one field name for both platforms —
                   what is INSIDE it differs, and the server has to tell them apart. */
                token = result.jwsRepresentation
            }
            call.resolve(["success": true,
                          "data": ["entitled": entitled, "purchaseCount": count, "purchaseToken": token]])
        }
    }

    // MARK: - purchase

    @objc func purchase(_ call: CAPPluginCall) {
        let playId = call.getString("productId") ?? Self.defaultProduct
        /* basePlanId carries the App Store product id, set by getProducts above. offerToken is
           accepted and ignored — Apple applies intro offers by eligibility, so there is nothing
           to pass. Ignoring rather than rejecting keeps one call signature across platforms. */
        let requested = call.getString("basePlanId")
        Task {
            do {
                let ids = requested.map { [$0] } ?? Self.appleProductIds(for: playId)
                guard let product = try await Product.products(for: ids).first else {
                    call.resolve(["success": false, "error": "That plan is not available."])
                    return
                }
                let result = try await product.purchase()
                switch result {
                case .success(let verification):
                    guard case .verified(let transaction) = verification else {
                        // Signature failed: treat as a failure, never as a purchase.
                        call.resolve(["success": false, "error": "Purchase could not be verified."])
                        return
                    }
                    await transaction.finish()
                    call.resolve(["success": true,
                                  "data": ["entitled": true,
                                           "purchaseToken": verification.jwsRepresentation,
                                           "productId": transaction.productID]])
                case .userCancelled:
                    /* Cancelling is NOT an error. The paywall returns silently on this, and
                       reporting it as a failure would show an error for a deliberate action. */
                    call.resolve(["success": false, "cancelled": true])
                case .pending:
                    // Ask to Buy, or SCA. The load() listener delivers it whenever it resolves.
                    call.resolve(["success": false, "pending": true,
                                  "error": "Purchase is pending approval."])
                @unknown default:
                    call.resolve(["success": false, "error": "Unknown purchase result."])
                }
            } catch {
                call.resolve(["success": false, "error": error.localizedDescription])
            }
        }
    }

    // MARK: - restore

    /* Android aliases restore to getEntitlement because Play re-reports owned purchases without
       a separate call. StoreKit needs AppStore.sync() first, which can prompt for the Apple ID
       password -- so it runs only on an explicit restore, never on a routine entitlement check. */
    @objc func restore(_ call: CAPPluginCall) {
        Task {
            try? await AppStore.sync()
            self.getEntitlement(call)
        }
    }

    // MARK: - openManageSubscriptions

    @objc func openManageSubscriptions(_ call: CAPPluginCall) {
        Task { @MainActor in
            guard let scene = self.bridge?.viewController?.view?.window?.windowScene else {
                call.resolve(["success": false, "error": "No window scene."])
                return
            }
            do {
                try await AppStore.showManageSubscriptions(in: scene)
                call.resolve(["success": true])
            } catch {
                call.resolve(["success": false, "error": error.localizedDescription])
            }
        }
    }

    // MARK: - helpers

    /// Apple's SubscriptionPeriod -> the ISO-8601 duration Play returns, so `period` means the
    /// same string on both platforms and the paywall needs no per-platform parsing.
    private static func iso8601(_ period: Product.SubscriptionPeriod) -> String {
        switch period.unit {
        case .day:   return "P\(period.value)D"
        case .week:  return "P\(period.value)W"
        case .month: return "P\(period.value)M"
        case .year:  return "P\(period.value)Y"
        @unknown default: return ""
        }
    }
}
