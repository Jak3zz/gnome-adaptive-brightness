import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

const BUS_NAME    = 'org.gnome.SettingsDaemon.Power';
const OBJECT_PATH = '/org/gnome/SettingsDaemon/Power';
const KBD_IFACE   = 'org.gnome.SettingsDaemon.Power.Keyboard';
const PROPS_IFACE = 'org.freedesktop.DBus.Properties';

export class KeyboardBacklightDbus {
    constructor() {
        this._proxy = null;
        this._steps = 3;
        this._last  = -1;
    }

    async connect() {
        // Use the Properties interface — that's what Set/Get actually live on
        this._proxy = Gio.DBusProxy.new_sync(
            Gio.DBus.session,
            Gio.DBusProxyFlags.NONE,
            null,
            BUS_NAME,
            OBJECT_PATH,
            PROPS_IFACE,   // <-- was KBD_IFACE; must be the Properties interface
            null
        );

        // Read current brightness via Properties.Get to confirm the proxy works
        try {
            const result = this._proxy.call_sync(
                'Get',
                new GLib.Variant('(ss)', [KBD_IFACE, 'Brightness']),
                Gio.DBusCallFlags.NONE,
                -1,
                null
            );
            // result is a (v,) — unwrap the variant-in-variant
            const brightness = result.deepUnpack()[0];
            log(`[kbd-backlight] current brightness: ${brightness}`);
        } catch (e) {
            log(`[kbd-backlight] could not read brightness: ${e}`);
        }
    }

    get Steps() {
        return this._steps;   // still 3: off / low / high
    }

    /**
     * level: integer 0 … (steps-1)
     *   0  → brightness   0  (off)
     *   1  → brightness  50  (low)
     *   2  → brightness 100  (high)
     */
    set BrightnessLevel(level) {
        if (!this._proxy) return;

        // Map 0-based level index to the three values gsd actually honours
        const map   = [0, 50, 100];
        const value = map[Math.max(0, Math.min(level, this._steps - 1))];

        if (this._last === value) return;
        this._last = value;

        try {
            this._proxy.call_sync(
                'Set',
                // signature matches: gdbus … Properties.Set iface prop <int32 N>
                new GLib.Variant('(ssv)', [
                    KBD_IFACE,
                    'Brightness',
                    new GLib.Variant('i', value),   // <int32 N>
                ]),
                Gio.DBusCallFlags.NONE,
                -1,
                null
            );
            log(`[kbd-backlight] brightness set to ${value}`);
        } catch (e) {
            log(`[kbd-backlight] Brightness write failed: ${e}`);
        }
    }

    destroy() {
        this._proxy = null;
    }
}