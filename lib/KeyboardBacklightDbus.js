import Gio from 'gi://Gio';

const LED = '/sys/class/leds/platform::kbd_backlight';

export class KeyboardBacklightDbus {
    constructor() {
        this._max = 2;
    }

    async connect() {
        try {
            const file = Gio.File.new_for_path(`${LED}/max_brightness`);
            const [ok, contents] = file.load_contents(null);
            if (ok) {
                this._max = parseInt(new TextDecoder().decode(contents)) || 2;
            }
        } catch (_) {
            this._max = 2;
        }
    }

    get Steps() {
        return this._max + 1; // include "off"
    }

    set BrightnessLevel(level) {
        const value = Math.max(0, Math.min(this._max, level));

        try {
            Gio.File.new_for_path(`${LED}/brightness`)
                .replace_contents(
                    `${value}\n`,
                    null,
                    false,
                    Gio.FileCreateFlags.NONE,
                    null
                );
        } catch (e) {
            log(`[kbd-backlight] write failed: ${e}`);
        }
    }

    destroy() {}
}