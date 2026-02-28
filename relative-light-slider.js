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
      margin-top: 8px;
      font-size: 14px;
      font-weight: 500;
    }

    input[type="range"] {
      width: 100%;
    }

    /* Custom slider styling */
    .custom-slider {
      -webkit-appearance: none;
      height: 6px;
      border-radius: 5px;
      background: var(--primary-color);
      outline: none;
    }

    .custom-slider::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: white;
      border: 2px solid var(--primary-color);
      cursor: pointer;
    }
  `;

  setConfig(config) {
    if (!config.entity) {
      throw new Error("You must define a light group entity");
    }

    this.config = {
      slider_style: "default", // default | custom
      ...config
    };

    this._value = 0;
  }

  set hass(hass) {
    this._hass = hass;

    if (!this.config) return;

    const avg = this._calculateAverageBrightness();
    if (avg !== null) {
      this._value = avg;
    }

    this.requestUpdate();
  }

  render() {
    const sliderClass =
      this.config.slider_style === "custom"
        ? "custom-slider"
        : "";

    return html`
      <ha-card header="${this.config.title || "Room Brightness"}">
        <input
          type="range"
          min="0"
          max="100"
          step="1"
          class="${sliderClass}"
          .value="${this._value}"
          @input="${this._onInput}"
          @change="${this._onChange}"
        />
        <div class="value">${this._value}%</div>
      </ha-card>
    `;
  }

  _calculateAverageBrightness() {
    const group = this._hass.states[this.config.entity];
    if (!group || !group.attributes.entity_id) return null;

    const lights = group.attributes.entity_id;

    let total = 0;
    let count = 0;

    lights.forEach(entityId => {
      const stateObj = this._hass.states[entityId];
      if (!stateObj) return;

      if (stateObj.state === "on") {
        const brightness = stateObj.attributes.brightness || 0;
        total += brightness;
        count++;
      }
    });

    if (count === 0) return 0;

    const avgBrightness = total / count;
    return Math.round((avgBrightness / 255) * 100);
  }

  _onInput(e) {
    this._value = e.target.value;
  }

  _onChange(e) {
    const percent = parseInt(e.target.value);
    this._setGroupBrightness(percent);
  }

  _setGroupBrightness(percent) {
    const group = this._hass.states[this.config.entity];
    if (!group || !group.attributes.entity_id) return;

    const targetBrightness = Math.round((percent / 100) * 255);

    group.attributes.entity_id.forEach(entityId => {
      const stateObj = this._hass.states[entityId];
      if (!stateObj) return;

      if (stateObj.state === "on") {
        this._hass.callService("light", "turn_on", {
          entity_id: entityId,
          brightness: targetBrightness
        });
      }
    });
  }

  getCardSize() {
    return 2;
  }
}

customElements.define("relative-light-slider", RelativeLightSlider);
