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
    }
    input[type="range"] {
      width: 100%;
    }
  `;

  setConfig(config) {
    if (!config.entity) {
      throw new Error("You must define a light group entity");
    }
    this.config = config;
    this._value = 0;
  }

  render() {
    return html`
      <ha-card header="${this.config.title || "Relative Brightness"}">
        <input
          type="range"
          min="-100"
          max="100"
          step="1"
          .value="${this._value}"
          @input="${this._onInput}"
          @change="${this._onChange}"
        />
        <div class="value">${this._value}%</div>
      </ha-card>
    `;
  }

  _onInput(e) {
    this._value = e.target.value;
  }

  _onChange(e) {
    const percent = parseInt(e.target.value);
    this._applyRelativeChange(percent);
    this._value = 0;
  }

  _applyRelativeChange(percent) {
    const group = this.hass.states[this.config.entity];
    if (!group || !group.attributes.entity_id) return;

    group.attributes.entity_id.forEach(entityId => {
      const stateObj = this.hass.states[entityId];
      if (!stateObj) return;

      if (stateObj.state === "on") {
        const currentBrightness = stateObj.attributes.brightness || 0;
        const delta = Math.round((percent / 100) * 255);
        let newBrightness = currentBrightness + delta;

        newBrightness = Math.max(1, Math.min(255, newBrightness));

        this.hass.callService("light", "turn_on", {
          entity_id: entityId,
          brightness: newBrightness
        });
      }
    });
  }

  getCardSize() {
    return 2;
  }
}

customElements.define("relative-light-slider", RelativeLightSlider);
