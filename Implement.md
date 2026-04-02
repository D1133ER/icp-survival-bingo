# ICP SURVIVAL BINGO – Complete Game Design & Enhanced Auto‑Draw Specification

> A ready‑to‑implement guide for teachers and developers.  
> Combines original gameplay rules with a **teacher‑friendly auto‑draw system** that is fully automatic yet fully controllable.

---

## Table of Contents

1. [Original Gameplay Summary](#1-original-gameplay-summary)  
2. [Analysis of Original Design](#2-analysis-of-original-design)  
3. [Problems with Original Auto‑Draw](#3-problems-with-original-auto-draw)  
4. [Enhanced Auto‑Draw – New Features](#4-enhanced-auto-draw--new-features)  
5. [Teacher UI Mockup](#5-teacher-ui-mockup)  
6. [Pseudo‑code Implementation](#6-pseudo-code-implementation)  
   - [Backend (Python / Node.js style)](#61-backend-python--nodejs-style)  
   - [Frontend (Teacher – JavaScript)](#62-frontend-teacher--javascript)  
7. [Additional Classroom Features](#7-additional-classroom-features-optional)  
8. [Implementation Checklist](#8-implementation-checklist)  
9. [Comparison: Original vs Enhanced](#9-comparison-original-vs-enhanced)  
10. [Final Notes](#10-final-notes)

---

## 1. Original Gameplay Summary

**Game name**: ICP SURVIVAL BINGO  
**Theme**: College survival (e.g., “All‑nighter before submission”, “Used ChatGPT for assignment”)

### Roles
- **Teacher (Host)** – Creates game, draws items, controls flow, declares winners.
- **Student (Player)** – Joins via code, marks card, hopes for BINGO.

### Game Flow
1. **Create / Join** – Teacher gets 6‑character code; students join with name + code. Each gets a shuffled 5×5 card.
2. **Start** – Teacher presses “Start Class” (only after that, no joins).
3. **The 5×5 Card** – 25 items numbered 1–25, split across B‑I‑N‑G‑O columns. **No FREE square**.
4. **Drawing Items** – Manual (🎱) or auto‑draw (▶ with countdown 3/5/8/12s). Server picks random uncalled item, saves it, checks for winners.
5. **Marking** – Students tap uncalled cells → amber/orange (self‑mark). Officially called items become purple/violet. Winning lines turn green.
6. **Winning** – Any complete row, column, or diagonal of officially called items. Server‑side detection. On BINGO: confetti, winner announcement, game finished.
7. **Leaderboard (Teacher View)** – Shows amber bar (self‑marks) and violet bar (called matches) per student. 👑 button to manually declare winner.
8. **After Game** – “Play Again” resets to home. Print card via `/print?code=XXXX`.

### Key Mechanics
- Card: 5×5, no free space, 25 fixed items shuffled per student.
- Win condition: row, column, diagonal.
- Sync: HTTP polling every 2 seconds.
- Identity: Player ID stored in localStorage per game code.

---

## 2. Analysis of Original Design

**Strengths**:
- No free square → more challenge.
- Pre‑marking (amber) encourages active listening.
- Auto‑draw with adjustable timer adapts to class pace.
- Automatic win detection removes disputes.
- Leaderboard instead of teacher card focuses teacher on facilitation.
- Print feature and localStorage recovery.

**Weaknesses / Missing** (from teacher perspective):
- Auto‑draw cannot be paused.
- Speed cannot be changed after start.
- No manual override during auto‑draw.
- No stop button except win.
- Requires two steps (Start Class → Auto Draw).

---

## 3. Problems with Original Auto‑Draw

| Problem | Impact |
|---------|--------|
| Separate “Start Class” + “Auto Draw” | Confusing, extra click |
| No pause button | Can’t explain terms or handle interruptions |
| Fixed speed before start | Can’t adapt to class energy |
| No manual draw during auto | Teacher can’t intervene without stopping auto |
| No stop button | Game stops only on win (or forced refresh) |

---

## 4. Enhanced Auto‑Draw – New Features

### 4.1 One‑Press “Start Auto Game”
- Combines “Start Class” + “Auto Draw” into a single button.
- Game → playing, locks joins, begins auto‑draw with default speed (e.g., 5 seconds).

### 4.2 Pause / Resume
- ⏸️ **Pause** – freezes countdown, no draws.
- ▶️ **Resume** – continues countdown from where it stopped.
- Manual draw still works while paused.

### 4.3 Adjustable Speed on the Fly
- Speed selector (3s / 5s / 8s / 12s) – click any during game.
- Changing speed restarts the countdown immediately with the new value.

### 4.4 Manual Draw Override
- 🎱 **Manual Draw** button draws one random uncalled item **instantly**.
- After manual draw, the auto‑draw timer resets to the selected speed (auto continues).

### 4.5 Stop Button
- ■ **Stop** – halts auto‑draw, ends game (or sets state to `finished`).
- Teacher can still declare a winner manually via 👑.

### 4.6 Draw Limit (Optional)
- Checkbox + number input: “Stop after __ draws”.
- Automatically ends the game when that many items have been called.

### 4.7 Visual & Audio Cues
- Large countdown display visible to all.
- Flash the called item on screen.
- Optional “ding” sound on each draw.
- Optional text‑to‑speech (TTS) announcing the drawn item.

---

## 5. Teacher UI Mockup

```
┌─────────────────────────────────────────────────────────┐
│ [ Start Auto Game ] [ Pause ⏸️ ] [ Stop ■ ] │
│ │
│ Speed: [3s] [5s] [8s] [12s] (click to change live) │
│ │
│ Next draw in: 5 seconds │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│ [ 🎱 Manual Draw ] [ ] Limit: [ 20 ] draws │
│ │
│ ─── Leaderboard (teacher view) ─── │
│ • Alice: ████░░░░ (4 amber, 3 violet) │
│ • Bob: ██████░░ (6 amber, 2 violet) │
│ 👑 (crown) to declare winner manually │
└─────────────────────────────────────────────────────────┘
```

---

## 6. Pseudo‑code Implementation

### 6.1 Backend (Python / Node.js style)

```python
class Game:
    def __init__(self):
        self.state = "waiting"        # waiting, playing, finished
        self.auto_draw = False
        self.paused = False
        self.draw_speed = 5           # seconds
        self.draw_limit = None
        self.draw_count = 0
        self.timer_handle = None

    def start_auto_game(self):
        if self.state != "waiting":
            return
        self.state = "playing"
        self.auto_draw = True
        self.paused = False
        self.draw_count = 0
        self._start_countdown()
        self.emit_to_all("game_started", {"auto": True})

    def _start_countdown(self):
        if not self.auto_draw or self.paused or self.state != "playing":
            return
        self.emit("countdown_start", {"duration": self.draw_speed})
        # Set a real timer (pseudo)
        self.timer_handle = set_timeout(self._on_timer_complete, self.draw_speed)

    def _on_timer_complete(self):
        if self.paused or not self.auto_draw:
            return
        self.draw_random_item()
        self.draw_count += 1
        if self.draw_limit and self.draw_count >= self.draw_limit:
            self.stop_auto_draw()
            self.state = "finished"
            self.emit("game_finished", {"reason": "draw_limit"})
        else:
            self._start_countdown()

    def draw_random_item(self):
        uncalled = [i for i in all_items if i not in called_numbers]
        if not uncalled:
            self.stop_auto_draw()
            return
        chosen = random.choice(uncalled)
        called_numbers.append(chosen)
        self.check_for_winners()   # automatically ends game if BINGO
        self.emit("item_drawn", {"item": chosen})

    def pause_auto_draw(self):
        if self.auto_draw and not self.paused and self.state == "playing":
            self.paused = True
            if self.timer_handle:
                cancel_timeout(self.timer_handle)
            self.emit("auto_paused", {})

    def resume_auto_draw(self):
        if self.auto_draw and self.paused and self.state == "playing":
            self.paused = False
            self._start_countdown()

    def stop_auto_draw(self):
        self.auto_draw = False
        self.paused = False
        if self.timer_handle:
            cancel_timeout(self.timer_handle)
        self.emit("auto_stopped", {})

    def manual_draw(self):
        if self.state != "playing":
            return
        # Cancel current countdown
        if self.timer_handle:
            cancel_timeout(self.timer_handle)
        self.draw_random_item()
        # If auto_draw is still enabled and not paused, restart timer
        if self.auto_draw and not self.paused:
            self._start_countdown()

    def set_speed(self, new_speed):
        self.draw_speed = new_speed
        # If countdown is active, restart with new speed
        if self.auto_draw and not self.paused and self.state == "playing":
            if self.timer_handle:
                cancel_timeout(self.timer_handle)
            self._start_countdown()
```

### 6.2 Frontend (Teacher – JavaScript)

```javascript
// Socket event handlers (assuming socket.io or similar)
const gameCode = "X9K2JM";

document.getElementById("startAutoBtn").onclick = () => {
    socket.emit("start_auto_game", { gameCode });
};

document.getElementById("pauseBtn").onclick = () => {
    socket.emit("pause_auto", { gameCode });
};

document.getElementById("resumeBtn").onclick = () => {
    socket.emit("resume_auto", { gameCode });
};

document.getElementById("stopBtn").onclick = () => {
    socket.emit("stop_auto", { gameCode });
};

document.getElementById("manualDrawBtn").onclick = () => {
    socket.emit("manual_draw", { gameCode });
};

// Speed selector
document.querySelectorAll(".speed-btn").forEach(btn => {
    btn.onclick = () => {
        const speed = parseInt(btn.dataset.speed);
        socket.emit("set_speed", { gameCode, speed });
    };
});

// Draw limit
document.getElementById("limitCheckbox").onchange = (e) => {
    const limit = e.target.checked ? parseInt(document.getElementById("limitValue").value) : null;
    socket.emit("set_draw_limit", { gameCode, limit });
};

// Listen to server events
socket.on("countdown_start", ({ duration }) => {
    showCountdown(duration);  // update UI
});

socket.on("item_drawn", ({ item }) => {
    flashItem(item);
    if (window.speechSynthesis && document.getElementById("ttsToggle").checked) {
        const utterance = new SpeechSynthesisUtterance(item);
        speechSynthesis.speak(utterance);
    }
    playSound("ding.mp3");
});

socket.on("auto_paused", () => { showPausedIndicator(true); });
socket.on("auto_resumed", () => { showPausedIndicator(false); });
socket.on("auto_stopped", () => { alert("Auto draw stopped."); });
```

---

## 7. Additional Classroom Features (Optional)

| Feature | Benefit |
|---------|----------|
| Text‑to‑Speech (TTS) | Announces each drawn item – great for students not looking at screen. Toggle on/off. |
| Draw history panel | Shows last 5‑10 calls with timestamps. Students can scroll back if they missed. |
| Visual flash | Highlight the called item on all cards with a yellow pulse. |
| Early win lock | When a BINGO is detected, auto‑draw stops immediately (no further draws). |
| Persistence | Save game state (called items, marks) so teacher can refresh without losing progress. |
| Sound effects | Optional “ding” on draw, “applause” on win. |

---

## 8. Implementation Checklist

- [ ] Modify backend `Game` class to include `auto_draw`, `paused`, `draw_speed`, `draw_limit`, `draw_count`.
- [ ] Implement timer management (cancel/reset).
- [ ] Add new socket events: `start_auto_game`, `pause_auto`, `resume_auto`, `stop_auto`, `manual_draw`, `set_speed`, `set_draw_limit`.
- [ ] Update teacher UI with new buttons and speed selector.
- [ ] Add countdown display component (shared or teacher‑only).
- [ ] Implement TTS toggle and draw history panel (frontend).
- [ ] Test edge cases: game ends naturally (BINGO) vs stop vs draw limit.
- [ ] Ensure manual draw resets timer correctly.
- [ ] Add sound files and visual flash CSS.
- [ ] Document the new features for teachers.

---

## 9. Comparison: Original vs Enhanced

| Feature | Original | Enhanced |
|---------|----------|----------|
| Start auto | Start Class + Auto Draw | One‑button “Start Auto Game” |
| Pause | ❌ | ✅ Pause / Resume |
| Change speed mid‑game | ❌ | ✅ Live speed selector |
| Manual draw during auto | ❌ | ✅ (resets timer) |
| Stop button | ❌ | ✅ |
| Draw limit | ❌ | ✅ Optional |
| TTS / sound | ❌ | ✅ Optional |
| Draw history | ❌ | ✅ |

---

## 10. Final Notes

- The enhanced auto‑draw keeps the teacher in control while eliminating repetitive clicks.
- All changes are backward compatible with existing student clients (only teacher UI/backend changes).
- Recommended sync method: WebSockets for real‑time, but polling can still work with short intervals.
- With this specification, you can build a truly automatic, classroom‑ready BINGO game.
