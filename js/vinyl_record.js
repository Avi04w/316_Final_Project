class VinylRecord {
  constructor() {
    this.outerShell = document.getElementById("record-player-shell-out");
    this.imageEl = document.getElementById("record-player-image");
    this.audioEl = document.getElementById("player");
    this.playing = false;

    this.outerShell.addEventListener("click", () => this.playing ? this.pause() : this.play());
    this.audioEl.addEventListener("ended", () => {
      this.audioEl.currentTime = 0;
      this.play();
    })
  }

  async load(songUrl, imageUrl) {
    this.outerShell.style.animationPlayState = "paused";
    this.audioEl.src = songUrl;
    this.imageEl.style.removeProperty("display");
    this.imageEl.src = imageUrl;
    this.outerShell.classList.add("rotate-infinite");
    await new Promise(r => setTimeout(r, 200));
  }

  play() {
    this.playing = true;
    this.audioEl.play().catch(err => console.error("Audio error:", err));
    this.outerShell.style.animationPlayState = "running"
  }

  pause() {
    this.playing = false;
    this.outerShell.style.animationPlayState = "paused";
    this.audioEl.pause();
  }

  isPaused() {
    return this.audioEl.paused;
  }
}
