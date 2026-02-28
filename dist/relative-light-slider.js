import { LitElement, html, css } from "https://unpkg.com/lit@2.8.0/index.js?module";

class RelativeLightSlider extends LitElement {
  static properties = {
    hass: {},
    config: {},
    _value: { state: true }
  };

  static styles = css`
    ha-card {
      padding: 16px;
    }

    .value {
      text-align: center;
      margin-top: 12px;
      font-weight: 500;
      font-size: 14px;
    }

    .slider-wrapper {
      --slider-color: var(--primary-color);
      transition: 0.3s ease;
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
  }

  set hass(hass) {
    this._hass = hass;
    const avg = this._calculateAverageBrightness();
    if (avg !== null) {
      this._value = avg;
    }
    this.requestUpdate();
  }

  render() {
    const dynamicColor = `hsl(${this._value}, 80%, 50%)`;

    return html`
      <ha-card header="${this.config.title || "Room Brightness"}">
        <div
          class="slider-wrapper"
          style="--slider-color:${dynamicColor}"
        >
          <ha-slider
            min="0"
            max="100"
            step="1"
            .value=${this._value}
            @change=${this._onChange}
          ></ha-slider>
        </div>

        <div class="value">${this._value}%</div>

        ${this.config.custom_css
          ? html`<style>${this.config.custom_css}</style>`
          : ""}
      </ha-card>
    `;
  }

  /* ------------------------
     ENTITY / AREA RESOLUTION
  ------------------------- */

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

  /* ------------------------
     AVERAGE CALCULATION
  ------------------------- */

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

    if (count === 0) return 0;
    return Math.round((total / count / 255) * 100);
  }

  /* ------------------------
     APPLY BRIGHTNESS
  ------------------------- */

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

      if (s.state === "off" && this.config.turn_on_if_above_zero) {
        this._hass.callService("light", "turn_on", {
          entity_id: id,
          brightness
        });
        return;
      }

      if (s.state === "on") {
        this._hass.callService("light", "turn_on", {
          entity_id: id,
          brightness
        });
      }
    });
  }

  getCardSize() {
    return 2;
  }
}

customElements.define("relative-light-slider", RelativeLightSlider);
