package com.varun.ignyt.billing

import android.util.Log
import com.android.billingclient.api.*
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import kotlinx.coroutines.CoroutineExceptionHandler
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import kotlinx.coroutines.suspendCancellableCoroutine
import org.json.JSONArray
import kotlin.coroutines.resume

/**
 * Google Play Billing for IGNYT's premium subscription.
 *
 * Play Billing is not one option among several: a Play-distributed app selling access to
 * digital content must use it. An external processor here would get IGNYT removed. (India
 * additionally permits an alternative system offered ALONGSIDE Play's, never instead of it —
 * that is a later decision, and this plugin does not preclude it.)
 *
 * The 7-day free trial is Google's, not ours. It is configured as an offer on the base plan
 * in Play Console, so Play owns the countdown, the conversion charge, cancellation and
 * refunds. There is deliberately no trial logic in this file or anywhere in the app: a
 * self-managed trial is defeated by reinstalling, and every edge case it creates —
 * cancellation, refund, grace period, account sharing, region change — is one Google has
 * already solved.
 *
 * Prices are never sent from the app. getProducts returns Play's own formatted price strings,
 * already localised, tax-inclusive and correct for whatever regional pricing or promotion
 * applies to that user. Hardcoding "₹249" would show a number Google is not charging.
 *
 * Every method resolves {"success": true, "data": ...} or {"success": false, "error": "..."} —
 * never rejects — matching the other IGNYT plugins so the JS side always gets a resolved
 * promise.
 */
@CapacitorPlugin(name = "IgnytBilling")
class BillingPlugin : Plugin() {

    private var billingClient: BillingClient? = null

    private val scope = CoroutineScope(
        SupervisorJob() + Dispatchers.Main + CoroutineExceptionHandler { _, e ->
            Log.e(TAG, "Unhandled coroutine exception", e)
        }
    )

    /** Set while a purchase sheet is open, so the listener can answer the right call. */
    private var pendingPurchaseCall: PluginCall? = null

    private val purchasesUpdatedListener = PurchasesUpdatedListener { result, purchases ->
        val call = pendingPurchaseCall
        pendingPurchaseCall = null
        if (call == null) {
            // A purchase completed outside a call we are tracking — most often Play retrying
            // a payment that was pending when the user last closed the app. Acknowledge it so
            // Google does not refund it after three days, and let the JS re-query.
            purchases?.forEach { scope.launch { acknowledgeIfNeeded(it) } }
            return@PurchasesUpdatedListener
        }
        when (result.responseCode) {
            BillingClient.BillingResponseCode.OK -> scope.launch {
                purchases?.forEach { acknowledgeIfNeeded(it) }
                resolveSuccess(call, JSObject().apply {
                    put("purchased", true)
                    put("entitled", purchases?.any { isEntitling(it) } == true)
                    // Returned here as well as from getEntitlement so the app can verify with
                    // the backend the instant a purchase completes, rather than waiting for
                    // the next entitlement query.
                    put("purchaseToken", entitlingToken(purchases.orEmpty()) ?: JSObject.NULL)
                })
            }
            // Not an error worth surfacing as one: the user changed their mind.
            BillingClient.BillingResponseCode.USER_CANCELED ->
                resolveSuccess(call, JSObject().apply { put("purchased", false); put("cancelled", true) })
            else ->
                resolveError(call, "Purchase failed: ${describe(result)}")
        }
    }

    override fun load() {
        billingClient = BillingClient.newBuilder(context)
            .setListener(purchasesUpdatedListener)
            .enablePendingPurchases(
                PendingPurchasesParams.newBuilder().enableOneTimeProducts().build()
            )
            .build()
    }

    override fun handleOnDestroy() {
        scope.cancel()
        billingClient?.endConnection()
        billingClient = null
    }

    /** Connects if needed. Play Billing drops its connection freely, so every call checks. */
    private suspend fun connected(): Boolean {
        val client = billingClient ?: return false
        if (client.isReady) return true
        return suspendCancellableCoroutine { cont ->
            client.startConnection(object : BillingClientStateListener {
                override fun onBillingSetupFinished(result: BillingResult) {
                    if (cont.isActive) cont.resume(result.responseCode == BillingClient.BillingResponseCode.OK)
                }
                override fun onBillingServiceDisconnected() {
                    if (cont.isActive) cont.resume(false)
                }
            })
        }
    }

    /**
     * The subscription's plans, priced by Play.
     *
     * Returns one entry per base plan with Play's formatted price and the offer token that
     * carries the free trial. The token is what the purchase flow needs to apply the trial —
     * buying without it charges immediately.
     */
    @PluginMethod
    fun getProducts(call: PluginCall) {
        val productId = call.getString("productId") ?: DEFAULT_PRODUCT
        scope.launch {
            if (!connected()) { resolveError(call, "Google Play billing is unavailable on this device."); return@launch }
            val params = QueryProductDetailsParams.newBuilder()
                .setProductList(listOf(
                    QueryProductDetailsParams.Product.newBuilder()
                        .setProductId(productId)
                        .setProductType(BillingClient.ProductType.SUBS)
                        .build()
                )).build()

            val (result, details) = queryProductDetails(params)
            if (result.responseCode != BillingClient.BillingResponseCode.OK) {
                resolveError(call, "Could not load plans: ${describe(result)}"); return@launch
            }
            val product = details.firstOrNull()
            if (product == null) {
                // Almost always means the subscription has not been created in Play Console
                // yet, or the build is not signed with the uploaded key.
                resolveError(call, "No subscription named '$productId' is available for this app."); return@launch
            }

            val plans = JSONArray()
            product.subscriptionOfferDetails?.forEach { offer ->
                val phases = offer.pricingPhases.pricingPhaseList
                // The recurring phase is the real price; a free-trial phase precedes it at zero.
                val paid = phases.lastOrNull()
                val trial = phases.firstOrNull { it.priceAmountMicros == 0L }
                plans.put(JSObject().apply {
                    put("basePlanId", offer.basePlanId)
                    put("offerToken", offer.offerToken)
                    put("offerId", offer.offerId ?: JSObject.NULL)
                    put("price", paid?.formattedPrice ?: "")
                    put("priceMicros", paid?.priceAmountMicros ?: 0L)
                    put("currency", paid?.priceCurrencyCode ?: "")
                    put("period", paid?.billingPeriod ?: "")
                    put("hasFreeTrial", trial != null)
                    put("trialPeriod", trial?.billingPeriod ?: JSObject.NULL)
                })
            }
            resolveSuccess(call, JSObject().apply {
                put("productId", productId)
                put("title", product.title)
                put("plans", plans)
            })
        }
    }

    /** Does this user currently have an active subscription? */
    @PluginMethod
    fun getEntitlement(call: PluginCall) {
        scope.launch {
            if (!connected()) { resolveError(call, "Google Play billing is unavailable on this device."); return@launch }
            val (result, purchases) = queryPurchases()
            if (result.responseCode != BillingClient.BillingResponseCode.OK) {
                resolveError(call, "Could not check your subscription: ${describe(result)}"); return@launch
            }
            // Acknowledging here as well as on purchase covers the case where the app was
            // killed between paying and acknowledging: Play auto-refunds an unacknowledged
            // purchase after three days, and the user would have paid for nothing.
            purchases.forEach { acknowledgeIfNeeded(it) }
            val entitled = purchases.any { isEntitling(it) }
            resolveSuccess(call, JSObject().apply {
                put("entitled", entitled)
                put("purchaseCount", purchases.size)
                // THE RECEIPT, for the server to verify with Google.
                //
                // `entitled` above is this device's own opinion, and it is only good enough to
                // decide what to draw. The backend cannot take an app's word for it — a
                // modified build says yes — so it needs the token itself, which it hands
                // straight back to Google. Nothing here is trusted; the token is evidence.
                //
                // Only an ENTITLING purchase's token is exposed. A PENDING one has not been
                // paid for, and offering its token would have the server verify a purchase
                // that may never settle.
                put("purchaseToken", entitlingToken(purchases) ?: JSObject.NULL)
            })
        }
    }

    /** Opens Play's purchase sheet. Resolves through purchasesUpdatedListener. */
    @PluginMethod
    fun purchase(call: PluginCall) {
        val productId = call.getString("productId") ?: DEFAULT_PRODUCT
        val basePlanId = call.getString("basePlanId")
        val suppliedToken = call.getString("offerToken")
        scope.launch {
            if (!connected()) { resolveError(call, "Google Play billing is unavailable on this device."); return@launch }
            val activity = activity
            if (activity == null) { resolveError(call, "No activity to show the purchase sheet."); return@launch }

            val params = QueryProductDetailsParams.newBuilder()
                .setProductList(listOf(
                    QueryProductDetailsParams.Product.newBuilder()
                        .setProductId(productId)
                        .setProductType(BillingClient.ProductType.SUBS)
                        .build()
                )).build()
            val (result, details) = queryProductDetails(params)
            val product = details.firstOrNull()
            if (result.responseCode != BillingClient.BillingResponseCode.OK || product == null) {
                resolveError(call, "That plan is not available right now."); return@launch
            }

            // Prefer the token the JS was shown, so the user is charged the offer they read.
            val offer = product.subscriptionOfferDetails?.firstOrNull { it.offerToken == suppliedToken }
                ?: product.subscriptionOfferDetails?.firstOrNull { it.basePlanId == basePlanId }
            if (offer == null) { resolveError(call, "That plan is not available right now."); return@launch }

            pendingPurchaseCall = call
            call.setKeepAlive(true)
            val flow = BillingFlowParams.newBuilder()
                .setProductDetailsParamsList(listOf(
                    BillingFlowParams.ProductDetailsParams.newBuilder()
                        .setProductDetails(product)
                        .setOfferToken(offer.offerToken)
                        .build()
                )).build()
            val launch = billingClient?.launchBillingFlow(activity, flow)
            if (launch == null || launch.responseCode != BillingClient.BillingResponseCode.OK) {
                pendingPurchaseCall = null
                resolveError(call, "Could not open Google Play: ${launch?.let { describe(it) } ?: "unknown error"}")
            }
        }
    }

    /** Re-reads purchases from Play — the "Restore purchases" button. */
    @PluginMethod
    fun restore(call: PluginCall) = getEntitlement(call)

    /** Opens Play's subscription management page for this app. */
    @PluginMethod
    fun openManageSubscriptions(call: PluginCall) {
        try {
            val url = "https://play.google.com/store/account/subscriptions" +
                "?sku=$DEFAULT_PRODUCT&package=${context.packageName}"
            activity.startActivity(android.content.Intent(android.content.Intent.ACTION_VIEW, android.net.Uri.parse(url)))
            resolveSuccess(call, JSObject().apply { put("opened", true) })
        } catch (e: Exception) {
            resolveError(call, "Could not open Google Play: ${e.message}")
        }
    }

    // ---- helpers ----

    /** Purchased and paid for. A PENDING purchase is not entitling until Play settles it. */
    private fun isEntitling(purchase: Purchase): Boolean =
        purchase.purchaseState == Purchase.PurchaseState.PURCHASED

    /**
     * The token of the purchase that actually entitles this user, or null.
     *
     * Deliberately not "the first purchase": a user can hold a PENDING one alongside a settled
     * one, and handing the server a pending token would ask Google to verify a payment that
     * may never complete. Only a PURCHASED one is evidence of anything.
     */
    private fun entitlingToken(purchases: List<Purchase>): String? =
        purchases.firstOrNull { isEntitling(it) }?.purchaseToken

    private suspend fun acknowledgeIfNeeded(purchase: Purchase) {
        if (!isEntitling(purchase) || purchase.isAcknowledged) return
        val params = AcknowledgePurchaseParams.newBuilder()
            .setPurchaseToken(purchase.purchaseToken).build()
        suspendCancellableCoroutine<Unit> { cont ->
            billingClient?.acknowledgePurchase(params) { if (cont.isActive) cont.resume(Unit) }
                ?: run { if (cont.isActive) cont.resume(Unit) }
        }
    }

    private suspend fun queryProductDetails(params: QueryProductDetailsParams):
        Pair<BillingResult, List<ProductDetails>> =
        suspendCancellableCoroutine { cont ->
            billingClient?.queryProductDetailsAsync(params) { result, details ->
                if (cont.isActive) cont.resume(result to details)
            } ?: run {
                if (cont.isActive) cont.resume(
                    BillingResult.newBuilder()
                        .setResponseCode(BillingClient.BillingResponseCode.SERVICE_DISCONNECTED)
                        .build() to emptyList()
                )
            }
        }

    private suspend fun queryPurchases(): Pair<BillingResult, List<Purchase>> =
        suspendCancellableCoroutine { cont ->
            val params = QueryPurchasesParams.newBuilder()
                .setProductType(BillingClient.ProductType.SUBS).build()
            billingClient?.queryPurchasesAsync(params) { result, purchases ->
                if (cont.isActive) cont.resume(result to purchases)
            } ?: run {
                if (cont.isActive) cont.resume(
                    BillingResult.newBuilder()
                        .setResponseCode(BillingClient.BillingResponseCode.SERVICE_DISCONNECTED)
                        .build() to emptyList()
                )
            }
        }

    private fun describe(result: BillingResult): String =
        "${result.responseCode}${if (result.debugMessage.isNullOrBlank()) "" else " — ${result.debugMessage}"}"

    private fun resolveSuccess(call: PluginCall, data: JSObject) {
        call.setKeepAlive(false)
        call.resolve(JSObject().apply { put("success", true); put("data", data) })
    }

    private fun resolveError(call: PluginCall, message: String) {
        call.setKeepAlive(false)
        call.resolve(JSObject().apply { put("success", false); put("error", message) })
    }

    companion object {
        private const val TAG = "IgnytBilling"
        private const val DEFAULT_PRODUCT = "ignyt_premium"
    }
}
