const $ = (id) => document.getElementById(id);

export class Hud {
  constructor() {
    this.topic = $('topic');
    this.topicLabel = $('topic-label');
    this.topicBlurb = $('topic-blurb');
    this.banner = $('banner');
    this.muteBtn = $('mute-btn');
    this.topicTimer = 0;
    this.bannerTimer = 0;
  }

  showTopic(p, color) {
    this.topicLabel.textContent = p.label.replace('\n', ' ');
    this.topicLabel.style.color = color;
    this.topicLabel.style.textShadow = `0 0 8px ${color}, 0 0 22px ${color}`;
    this.topicBlurb.textContent = p.blurb;
    this.topic.classList.remove('hidden');
    clearTimeout(this.topicTimer);
    this.topicTimer = setTimeout(() => this.topic.classList.add('hidden'), 7000);
  }

  showBanner(html, ms = 5000) {
    this.banner.innerHTML = html;
    this.banner.classList.remove('hidden');
    clearTimeout(this.bannerTimer);
    this.bannerTimer = setTimeout(() => this.banner.classList.add('hidden'), ms);
  }

  setPathDone(branch) {
    const el = $(`p-${branch}`);
    el.classList.add('done');
    el.querySelector('.mark').textContent = '◆';
  }

  setMuted(muted) {
    this.muteBtn.textContent = muted ? 'Sound off (M)' : 'Sound on (M)';
  }
}
