/**
 * 打赏弹窗（可配置，读 sponsor.json 渲染多方式 Tab）
 * @module ui/modal
 */

import { CONFIG } from '../config.js';

export class SupportModal {
  constructor(options = {}) {
    this.modal = options.modal || document.getElementById('supportModal');
    this.openBtn = options.openBtn || document.getElementById('supportBtn');
    this.closeBtn = options.closeBtn || document.getElementById('supportCloseBtn');
    this.sponsorConfig = options.sponsorConfig || 'sponsor.json';
    this.isOpen = false;
    this.animationDuration = options.animationDuration || CONFIG.UI.MODAL_ANIMATION_DURATION;
    this.tabsEl = document.getElementById('sponsorTabs');
    this.panelsEl = document.getElementById('sponsorPanels');
    this.data = null;
  }

  init() {
    if (!this.modal || !this.openBtn || !this.closeBtn) return;

    this.openBtn.addEventListener('click', () => this.open());
    this.closeBtn.addEventListener('click', () => this.close());
    this.modal.addEventListener('click', (event) => {
      if (event.target === this.modal) this.close();
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && this.isOpen) this.close();
    });

    this.loadSponsor();
  }

  async loadSponsor() {
    try {
      const resp = await fetch(this.sponsorConfig);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      this.data = await resp.json();
      this.render();
    } catch (e) {
      // 配置缺失时的兜底：保留默认两张图（占位）
      console.warn('打赏配置加载失败，使用默认', e);
      this.data = {
        note: '如果内容有帮助过您，欢迎自愿支持（可选）。',
        thanks: '感谢您的认可与善意，祝您一切顺利！',
        methods: [
          { id: 'wechat', label: '微信', type: 'qr', image: 'sponsor-wechat.jpg', desc: '微信收款码' },
          { id: 'alipay', label: '支付宝', type: 'qr', image: 'sponsor-alipay.jpg', desc: '支付宝收款码' },
        ],
      };
      this.render();
    }
  }

  render() {
    if (!this.data || !this.data.methods || !this.data.methods.length) return;
    const methods = this.data.methods;
    if (this.tabsEl) {
      this.tabsEl.innerHTML = '';
      methods.forEach((m, i) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'sponsor-tab' + (i === 0 ? ' active' : '');
        b.textContent = m.label;
        b.dataset.tab = m.id;
        b.addEventListener('click', () => this.switchTab(m.id));
        this.tabsEl.appendChild(b);
      });
    }
    if (this.panelsEl) {
      this.panelsEl.innerHTML = '';
      methods.forEach((m, i) => {
        const p = document.createElement('div');
        p.className = 'sponsor-panel' + (i === 0 ? ' active' : '');
        p.dataset.panel = m.id;
        p.innerHTML = this.buildPanel(m);
        this.panelsEl.appendChild(p);
      });
    }
    this.switchTab(methods[0].id);
  }

  buildPanel(m) {
    // 支持 qr(图) / link(按钮跳转) 两种
    if (m.type === 'link') {
      return `<a class="sponsor-link" href="${m.href || '#'}" target="_blank" rel="noopener noreferrer">${m.label || '打开支持页'} →</a>`;
    }
    // qr：图 + 说明
    return `<img class="sponsor-qr" src="${m.image}" alt="${m.label || '收款码'}" loading="lazy"/>`
      + (m.desc ? `<p class="sponsor-desc">${m.desc}</p>` : '');
  }

  switchTab(id) {
    document.querySelectorAll('.sponsor-tab').forEach((t) => t.classList.toggle('active', t.dataset.tab === id));
    document.querySelectorAll('.sponsor-panel').forEach((p) => p.classList.toggle('active', p.dataset.panel === id));
  }

  open() {
    if (!this.modal || this.isOpen) return;
    this.modal.classList.add('open');
    this.modal.setAttribute('aria-hidden', 'false');
    this.isOpen = true;
    this.closeBtn?.focus();
  }

  close() {
    if (!this.modal || !this.isOpen) return;
    this.modal.classList.remove('open');
    this.modal.setAttribute('aria-hidden', 'true');
    this.isOpen = false;
    this.openBtn?.focus();
  }
}
