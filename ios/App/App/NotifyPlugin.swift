import Foundation
import Capacitor
import UserNotifications

/**
 The iOS half of IGNYT's reminders.

 Registered as "IgnytNotify" and matching android/.../notify/NotifyPlugin.kt method for method,
 argument for argument, and return shape for return shape, so www/js/notify/reminders.js runs
 unchanged. Same contract as every other IGNYT plugin: expected failures resolve with a flag
 rather than rejecting, so the JS side always gets a normal resolved promise.

 WHAT REPLACES ANDROID'S MACHINERY. Android needs AlarmManager, a BroadcastReceiver, a
 BootReceiver to re-arm after a restart, and SharedPreferences to remember what to re-arm.
 UNUserNotificationCenter does all of that itself: a scheduled request survives both app
 termination and reboot, and the system holds the schedule. So there is no scheduler, no
 receiver and no persistence here — not because they were skipped, but because iOS already
 owns that job and a second copy could only disagree with it.

 That is also why listScheduled reads back from the system rather than from a store of our own.
 It answers what is ACTUALLY pending, which is the question the JS layer is asking when it
 reconciles after a reinstall.

 THREE THINGS CANNOT MEAN ON iOS WHAT THEY MEAN ON ANDROID. Each is implemented honestly and
 says so at its own definition rather than pretending:
   showActiveWorkout — iOS has no ongoing notification and no chronometer
   scheduleDaily with intervalDays > 1 — no "every N days" trigger exists
   channels — iOS has no per-channel sound/vibration; the flags are applied per request
 */
@objc(IgnytNotifyPlugin)
public class IgnytNotifyPlugin: CAPPlugin, CAPBridgedPlugin, UNUserNotificationCenterDelegate {

    public let identifier = "IgnytNotifyPlugin"
    public let jsName = "IgnytNotify"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "checkPermission",    returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestPermission",  returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "scheduleDaily",      returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "scheduleAt",         returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "scheduleWeekly",     returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "listScheduled",      returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "cancel",             returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "sendTest",           returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "showActiveWorkout",  returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "hideActiveWorkout",  returnType: CAPPluginReturnPromise)
    ]

    private let center = UNUserNotificationCenter.current()

    /// Android gives the live workout notification a fixed integer id so it can be replaced and
    /// cleared. Same idea, as a string.
    private static let workoutId = "ignyt_active_workout"

    /// A weekly reminder becomes one request per weekday, because a calendar trigger fires on
    /// one weekday. They share this separator so cancel() can find every part of a reminder
    /// from its base id alone, and listScheduled can report the base id once rather than seven
    /// times. "#" cannot appear in an id from the JS layer, which uses fixed slugs.
    private static let daySeparator = "#"

    private static let categoryId = "IGNYT_REMINDER"
    private static let snoozeAction = "IGNYT_SNOOZE"

    public override func load() {
        /* Taking the delegate is what makes a tap reach the app. Without it a notification opens
           IGNYT and nothing else happens — no route, so the reminder that says "log your weight"
           lands wherever you last were. */
        center.delegate = self

        let snooze = UNNotificationAction(identifier: Self.snoozeAction, title: "Snooze", options: [])
        center.setNotificationCategories([
            UNNotificationCategory(identifier: Self.categoryId,
                                   actions: [snooze],
                                   intentIdentifiers: [],
                                   options: [])
        ])
    }

    // MARK: - Permission

    private func granted(_ completion: @escaping (Bool) -> Void) {
        center.getNotificationSettings { s in
            completion(s.authorizationStatus == .authorized
                       || s.authorizationStatus == .provisional
                       || s.authorizationStatus == .ephemeral)
        }
    }

    @objc func checkPermission(_ call: CAPPluginCall) {
        granted { call.resolve(["granted": $0]) }
    }

    /**
     iOS shows the system prompt ONCE, ever. A second call after a denial does nothing at all —
     it does not re-prompt and it does not error — so this resolves with the real current state
     rather than reporting success for a sheet that never appeared. Recovering from a denial is
     a trip to Settings, which only the user can make.
     */
    @objc func requestPermission(_ call: CAPPluginCall) {
        center.requestAuthorization(options: [.alert, .sound, .badge]) { ok, _ in
            // Deliberately re-read rather than trusting `ok`: on a second call after a denial
            // the completion reports false with no prompt shown, and on a provisional
            // authorisation the settings are the honest answer.
            self.granted { call.resolve(["granted": $0]) }
        }
    }

    // MARK: - Scheduling

    private func content(title: String, body: String, route: String,
                         snoozeMinutes: Int, silent: Bool) -> UNMutableNotificationContent {
        let c = UNMutableNotificationContent()
        c.title = title
        c.body = body
        /* iOS has no channels, so what Android fixes at channel creation is set per request.
           There is no vibration control: on iOS vibration follows the sound setting and the
           phone's own ring/silent switch, so `vibrate` is accepted from the JS layer and has no
           iOS-side effect rather than being faked. */
        c.sound = silent ? nil : .default
        c.userInfo = ["route": route, "snoozeMinutes": snoozeMinutes, "title": title, "body": body]
        if snoozeMinutes > 0 { c.categoryIdentifier = Self.categoryId }
        return c
    }

    private func add(_ id: String, _ content: UNNotificationContent, _ trigger: UNNotificationTrigger?) {
        center.add(UNNotificationRequest(identifier: id, content: content, trigger: trigger))
    }

    /**
     intervalDays is where iOS has no equivalent. A calendar trigger repeats on a *calendar*
     pattern — every day, or every Tuesday — and there is no "every third day". Rather than
     silently treating 3 as 1, an interval greater than one is scheduled as a run of one-shots
     at the right spacing, far enough ahead to cover normal use.

     14 of them, not hundreds: iOS keeps only the 64 soonest pending notifications per app and
     drops the rest without telling you, so a generous run here would silently evict the user's
     other reminders. The JS layer re-arms on launch, which is what keeps the run topped up.
     */
    @objc func scheduleDaily(_ call: CAPPluginCall) {
        guard let id = call.getString("id"), !id.isEmpty else { call.reject("id is required"); return }
        let hour = call.getInt("hour") ?? 20
        let minute = call.getInt("minute") ?? 0
        let title = call.getString("title") ?? "IGNYT"
        let body = call.getString("body") ?? ""
        let intervalDays = max(1, call.getInt("intervalDays") ?? 1)
        let route = call.getString("route") ?? ""

        removeAll(forBase: id)
        let c = content(title: title, body: body, route: route, snoozeMinutes: 0, silent: false)

        if intervalDays == 1 {
            var comps = DateComponents(); comps.hour = hour; comps.minute = minute
            add(id, c, UNCalendarNotificationTrigger(dateMatching: comps, repeats: true))
        } else {
            let cal = Calendar.current
            var next = cal.nextDate(after: Date(),
                                    matching: DateComponents(hour: hour, minute: minute),
                                    matchingPolicy: .nextTime) ?? Date().addingTimeInterval(3600)
            for i in 0..<14 {
                let comps = cal.dateComponents([.year, .month, .day, .hour, .minute], from: next)
                add("\(id)\(Self.daySeparator)\(i)", c,
                    UNCalendarNotificationTrigger(dateMatching: comps, repeats: false))
                next = cal.date(byAdding: .day, value: intervalDays, to: next) ?? next
            }
        }
        call.resolve(["scheduled": true])
    }

    /// One-shot at an absolute epoch time. Epoch millis exceeds Int across the bridge, so it
    /// arrives as a double — the same narrowing the Android plugin documents.
    @objc func scheduleAt(_ call: CAPPluginCall) {
        guard let id = call.getString("id"), !id.isEmpty else { call.reject("id is required"); return }
        guard let at = call.getDouble("at"), at > 0 else { call.reject("at (epoch millis) is required"); return }

        let fireAt = Date(timeIntervalSince1970: at / 1000.0)
        let seconds = fireAt.timeIntervalSinceNow
        /* Already past. Dropped rather than fired immediately: these are fasting nudges, and a
           halfway alert arriving after the fast ended is worse than none. */
        guard seconds > 0 else { call.resolve(["scheduled": false, "reason": "in-the-past"]); return }

        let c = content(title: call.getString("title") ?? "IGNYT",
                        body: call.getString("body") ?? "",
                        route: call.getString("route") ?? "",
                        snoozeMinutes: 0, silent: false)
        removeAll(forBase: id)
        add(id, c, UNTimeIntervalNotificationTrigger(timeInterval: seconds, repeats: false))
        call.resolve(["scheduled": true])
    }

    /**
     days: 0=Sunday..6=Saturday, JavaScript's Date.getDay(), matching the Android plugin.
     DateComponents.weekday is 1=Sunday..7=Saturday, hence the +1. An empty list cancels.

     One request per day because a calendar trigger fires on one weekday.
     */
    @objc func scheduleWeekly(_ call: CAPPluginCall) {
        guard let id = call.getString("id"), !id.isEmpty else { call.reject("id is required"); return }
        /* Numbers cross the bridge as NSNumber, so the cast goes through NSNumber rather than
           straight to Int — `as? Int` on a bridged JS number fails silently and would leave
           every weekly reminder scheduled on no days at all. */
        let rawDays = call.getArray("days") ?? []
        let days = rawDays.compactMap { ($0 as? NSNumber)?.intValue }
        let hour = call.getInt("hour") ?? 9
        let minute = call.getInt("minute") ?? 0

        removeAll(forBase: id)
        guard !days.isEmpty else { call.resolve(["scheduled": false, "days": 0]); return }

        let c = content(title: call.getString("title") ?? "IGNYT",
                        body: call.getString("body") ?? "",
                        route: call.getString("route") ?? "",
                        snoozeMinutes: call.getInt("snoozeMinutes") ?? 0,
                        silent: call.getBool("silent", false) ?? false)

        for day in days where (0...6).contains(day) {
            var comps = DateComponents()
            comps.weekday = day + 1
            comps.hour = hour
            comps.minute = minute
            add("\(id)\(Self.daySeparator)\(day)", c,
                UNCalendarNotificationTrigger(dateMatching: comps, repeats: true))
        }
        call.resolve(["scheduled": true, "days": days.count])
    }

    /// Read back from the system, not from a store of our own — see the class comment. Base ids
    /// only, so a weekly reminder on five days reports as one id rather than five.
    @objc func listScheduled(_ call: CAPPluginCall) {
        center.getPendingNotificationRequests { reqs in
            var ids: [String] = []
            for r in reqs {
                let base = r.identifier.components(separatedBy: Self.daySeparator)[0]
                if base != Self.workoutId && !ids.contains(base) { ids.append(base) }
            }
            call.resolve(["ids": ids])
        }
    }

    @objc func cancel(_ call: CAPPluginCall) {
        guard let id = call.getString("id"), !id.isEmpty else { call.reject("id is required"); return }
        removeAll(forBase: id)
        call.resolve(["cancelled": true])
    }

    /// Removes the request itself and every per-day part of it. Asking the system for the
    /// pending list rather than reconstructing the ids means a reminder scheduled by an older
    /// build, under a naming scheme this one no longer uses, is still cancellable.
    private func removeAll(forBase id: String) {
        center.getPendingNotificationRequests { reqs in
            let ids = reqs.map { $0.identifier }.filter {
                $0 == id || $0.hasPrefix(id + Self.daySeparator)
            }
            if !ids.isEmpty { self.center.removePendingNotificationRequests(withIdentifiers: ids) }
        }
    }

    /// A trigger of 1 second, not nil. A nil trigger delivers immediately, and iOS suppresses an
    /// immediate notification while the app is in the foreground unless the delegate intervenes
    /// — which would make "send a test" appear to do nothing in the one situation where someone
    /// is definitely watching for it.
    @objc func sendTest(_ call: CAPPluginCall) {
        let c = content(title: call.getString("title") ?? "IGNYT",
                        body: call.getString("body") ?? "Notifications are working.",
                        route: "", snoozeMinutes: 0, silent: false)
        add("ignyt_test", c, UNTimeIntervalNotificationTrigger(timeInterval: 1, repeats: false))
        call.resolve(["sent": true])
    }

    // MARK: - Live workout

    /**
     The nearest honest equivalent, and it is not the same thing.

     Android posts an ongoing notification with a chronometer: it cannot be swiped away while
     the session is open, and it counts up on its own with the app asleep. iOS has neither. A
     notification cannot be made non-dismissible, and nothing in UserNotifications ticks. The
     feature that does both is a Live Activity, which needs ActivityKit and a widget extension —
     a separate target, not a method on this plugin.

     So this posts a normal notification with the elapsed time as text at the moment it is
     shown. It brings you back to the workout, which is the point of it; it does not tick, and
     it can be dismissed. Saying so here is better than a JS layer that believes otherwise.
     */
    @objc func showActiveWorkout(_ call: CAPPluginCall) {
        granted { ok in
            guard ok else { call.resolve(["shown": false, "reason": "no-permission"]); return }
            let c = self.content(title: call.getString("title") ?? "Workout in progress",
                                 body: call.getString("body") ?? "Tap to finish your workout.",
                                 route: "workout", snoozeMinutes: 0, silent: true)
            self.center.removePendingNotificationRequests(withIdentifiers: [Self.workoutId])
            self.center.removeDeliveredNotifications(withIdentifiers: [Self.workoutId])
            self.add(Self.workoutId, c, UNTimeIntervalNotificationTrigger(timeInterval: 1, repeats: false))
            call.resolve(["shown": true, "ongoing": false])
        }
    }

    /// Clears both the pending request and the delivered one. Safe when nothing is showing.
    @objc func hideActiveWorkout(_ call: CAPPluginCall) {
        center.removePendingNotificationRequests(withIdentifiers: [Self.workoutId])
        center.removeDeliveredNotifications(withIdentifiers: [Self.workoutId])
        call.resolve(["hidden": true])
    }

    // MARK: - Delivery

    /// Without this, iOS silently swallows any notification that fires while the app is open —
    /// which is exactly when someone taps "send test".
    public func userNotificationCenter(_ center: UNUserNotificationCenter,
                                       willPresent notification: UNNotification,
                                       withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
        completionHandler([.banner, .sound, .list])
    }

    public func userNotificationCenter(_ center: UNUserNotificationCenter,
                                       didReceive response: UNNotificationResponse,
                                       withCompletionHandler completionHandler: @escaping () -> Void) {
        let info = response.notification.request.content.userInfo

        if response.actionIdentifier == Self.snoozeAction {
            let mins = (info["snoozeMinutes"] as? Int) ?? 10
            let c = content(title: (info["title"] as? String) ?? "IGNYT",
                            body: (info["body"] as? String) ?? "",
                            route: (info["route"] as? String) ?? "",
                            snoozeMinutes: mins, silent: false)
            add("\(response.notification.request.identifier)\(Self.daySeparator)snoozed", c,
                UNTimeIntervalNotificationTrigger(timeInterval: TimeInterval(mins * 60), repeats: false))
            completionHandler()
            return
        }

        deliverRoute((info["route"] as? String) ?? "")
        completionHandler()
    }

    /**
     Hands the route to the web layer as a window property rather than an event, for the reason
     MainActivity.java records on the Android side: a cold start may not have finished loading
     the WebView, and an event fired at nobody is simply lost. A property waits to be read.
     app.js consumes it once at boot and clears it.

     Whitelisted to [A-Za-z0-9_-] before being interpolated. These strings originate in this
     app's own scheduling calls, but a notification payload is an external input once it has
     been through the system, and building JS by concatenation with anything unsanitised is how
     that becomes script injection into the WebView.
     */
    private func deliverRoute(_ route: String) {
        let safe = route.filter { $0.isLetter || $0.isNumber || $0 == "_" || $0 == "-" }
        guard !safe.isEmpty else { return }
        DispatchQueue.main.async {
            self.bridge?.webView?.evaluateJavaScript("window.__ignytRoute = '\(safe)';")
        }
    }
}
