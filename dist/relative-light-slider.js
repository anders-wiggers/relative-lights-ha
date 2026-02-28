import { LitElement, html, css } from "https://unpkg.com/lit@2.8.0/index.js?module";

class RelativeLightSlider extends LitElement {
  static properties = {
    hass: {},
    config: {},
    _value: { state: true },
    _color: { state: true }
  };

  static styles = css`
    ha-card {
      padding: 16px;
    }

    .wrapper {
      width: 100%;
    }

    ha-slider {
      width: 100%;
      --mdc-theme-primary: var(--slider-color);
      --slider-color: var(--primary-color);
      transition: 0.3s ease;
      border-radius: 999px;
    }

    .slider-container {
      padding: 8px 0;
      transition: 0.3s ease;
    }

    .value {
      text-align: center;
      margin-top: 12px;
      font-weight: 500;
      opacity: 0.8;
    }

    /* Bubble look */
    ha-slider::part(track) {
      border-radius: 999px;
      height: 12px;
      background: rgba(255, 255, 255, 0.08);
    }

    ha-slider::part(track-active) {
      border-radius: 999px;
      height: 12px;
      background: var(--slider-color);
      box-shadow: 0 0 12px var(--slider-color);
      transition: 0.3s ease;
    }

    ha-slider::part(thumb) {
      width: 22px;
      height: 22px;
      background: white;
      border-radius: 50%;
      box-shadow: 0 2px 6px rgba(0,0,0,0.4);
      transition: 0.2s ease;
    }
  `;

  setConfig(config) {
    if (!config.entity && !config.area) {
      throw new Error("Define either 'entity' OR 'area'");
    }

    this.config = {
      turn_on_if_above_zero: true,
      ...config
    };

    this._value = 0;
    this._color = "var(--primary-color)";
  }

  set hass(hass) {
    this._hass = hass;

    this._value = this._calculateAverageBrightness();
    this._color = this._calculateAverageColor();

    this.requestUpdate();
  }

  render() {
    return html`
      <ha-card header="${this.config.title || "Room Brightness"}">
        <div
          class="wrapper"
          style="--slider-color:${this._color};"
        >
          <div class="slider-container">
            <ha-slider
              min="0"
              max="100"
              step="1"
              .value=${this._value}
              @change=${this._onChange}
            ></ha-slider>
          </div>

          <div class="value">${this._value}%</div>
        </div>

        ${this.config.custom_css
          ? html`<style>${this.config.custom_css}</style>`
          : ""}
      </ha-card>
    `;
  }

  /* -------------------------
     ENTITY / AREA RESOLUTION
  -------------------------- */

  _getTargetLights() {
    if (this.config.entity) {
      const group = this._hass.states[this.config.entity];
      if (group?.attributes?.entity_id) {
        return group.attributes.entity_id;
      }
      return [this.config.entity];
    }

    if (this.config.area) {
      const area = Object.values(this._hass.areas || {}).find(
        a => a.name === this.config.area
      );
      if (!area) return [];

      return Object.values(this._hass.states)
        .filter(
          s =>
            s.entity_id.startsWith("light.") &&
            s.attributes.area_id === area.area_id
        )
        .map(s => s.entity_id);
    }

    return [];
  }

  /* -------------------------
     BRIGHTNESS
  -------------------------- */

  _calculateAverageBrightness() {
    const lights = this._getTargetLights();
    if (!lights.length) return 0;

    let total = 0;
    let count = 0;

    lights.forEach(id => {
      const s = this._hass.states[id];
      if (s?.state === "on") {
        total += s.attributes.brightness || 0;
        count++;
      }
    });

    if (!count) return 0;
    return Math.round((total / count / 255) * 100);
  }

  /* -------------------------
     COLOR DETECTION
  -------------------------- */


  _calculateAverageColor() {
    const lights = this._getTargetLights();

    let r = 0, g = 0, b = 0, count = 0;

    lights.forEach(id => {
      const s = this._hass.states[id];
      if (!s || s.state !== "on") return;

      if (s.attributes.rgb_color) {
        r += s.attributes.rgb_color[0];
        g += s.attributes.rgb_color[1];
        b += s.attributes.rgb_color[2];
        count++;
      }
    });

    if (!count) return "var(--primary-color)";

    r = Math.round(r / count);
    g = Math.round(g / count);
    b = Math.round(b / count);

    return `rgb(${r}, ${g}, ${b})`;
  }

    _kelvinToRGB(kelvin) {
    // Clamp range
    kelvin = Math.min(6500, Math.max(2000, kelvin));
    const temp = kelvin / 100;

    let red, green, blue;

    // Red
    if (temp <= 66) {
      red = 255;
    } else {
      red = temp - 60;
      red = 329.698727446 * Math.pow(red, -0.1332047592);
      red = Math.min(255, Math.max(0, red));
    }

    // Green
    if (temp <= 66) {
      green = 99.4708025861 * Math.log(temp) - 161.1195681661;
    } else {
      green = temp - 60;
      green = 288.1221695283 * Math.pow(green, -0.0755148492);
    }
    green = Math.min(255, Math.max(0, green));

    // Blue
    if (temp >= 66) {
      blue = 255;
    } else if (temp <= 19) {
      blue = 0;
    } else {
      blue = temp - 10;
      blue = 138.5177312231 * Math.log(blue) - 305.0447927307;
      blue = Math.min(255, Math.max(0, blue));
    }

    return `rgb(${Math.round(red)}, ${Math.round(green)}, ${Math.round(blue)})`;
  }

  /* -------------------------
     APPLY
  -------------------------- */

  _onChange(e) {
    const percent = e.target.value;
    this._value = percent;
    this._applyBrightness(percent);
  }

  _applyBrightness(percent) {
    const lights = this._getTargetLights();
    const brightness = Math.round((percent / 100) * 255);

    lights.forEach(id => {
      const s = this._hass.states[id];
      if (!s) return;

      if (percent === 0) {
        this._hass.callService("light", "turn_off", {
          entity_id: id
        });
        return;
      }

      this._hass.callService("light", "turn_on", {
        entity_id: id,
        brightness
      });
    });
  }

  getCardSize() {
    return 2;
  }
}

customElements.define("relative-light-slider", RelativeLightSlider);
