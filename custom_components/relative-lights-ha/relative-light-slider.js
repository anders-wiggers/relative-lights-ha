class RelativeLightSlider extends HTMLElement {
  setConfig(config) {
    if (!config.entity) {
      throw new Error("You must define a light group entity");
    }
    this.config = config;
  }

  set hass(hass) {
    this._hass = hass;

    if (!this.content) {
      this.innerHTML = `
        <ha-card header="${this.config.title || 'Relative Brightness'}">
          <div style="padding:16px;">
            <input type="range"
                   min="-100"
                   max="100"
                   value="0"
                   step="1"
                   id="slider"
                   style="width:100%;">
            <div style="text-align:center; margin-top:8px;">
              <span id="value">0%</span>
            </div>
          </div>
        </ha-card>
      `;

      this.content = this.querySelector("div");
      this.slider = this.querySelector("#slider");
      this.valueDisplay = this.querySelector("#value");

      this.slider.addEventListener("input", (e) => {
        this.valueDisplay.innerText = `${e.target.value}%`;
      });

      this.slider.addEventListener("change", (e) => {
        this.applyRelativeChange(parseInt(e.target.value));
        this.slider.value = 0;
        this.valueDisplay.innerText = "0%";
      });
    }
  }

  applyRelativeChange(percent) {
    const group = this._hass.states[this.config.entity];
    if (!group || !group.attributes.entity_id) return;

    const lights = group.attributes.entity_id;

    lights.forEach(entityId => {
      const stateObj = this._hass.states[entityId];
      if (!stateObj) return;

      if (stateObj.state === "on") {
        const currentBrightness = stateObj.attributes.brightness || 0;
        const delta = Math.round((percent / 100) * 255);
        let newBrightness = currentBrightness + delta;

        newBrightness = Math.max(1, Math.min(255, newBrightness));

        this._hass.callService("light", "turn_on", {
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
