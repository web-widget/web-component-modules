// eslint-disable-next-line no-undef
export default class extends HTMLElement {
  constructor() {
    super();
    const shadowRoot = this.attachShadow({ mode: 'closed' });
    shadowRoot.innerHTML = `
      <div style="color: red"><slot name="main">no content</slot></div>
    `;
  }
}
