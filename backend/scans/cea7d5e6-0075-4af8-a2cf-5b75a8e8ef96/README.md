# 🎨 DALL-E's Doodle Duel

**DALL-E's Doodle Duel** is a fast-paced, offline guessing game built with Streamlit. Challenge yourself through a 5-level demo campaign by deciphering the secret prompts behind quirky, AI-inspired images.

---

## 💡 Features

- **Gemini-inspired dark theme** for a polished, professional look.
- **Sidebar control panel** with clear navigation, instructions, and score tracking.
- **5-level campaign** with increasing difficulty, culminating in an abstract "Boss Level."
- **Structured input boxes** for each secret keyword—no more single-line guessing!
- **Instant feedback cards** show your guesses side-by-side with the real answers, using ✅ and ❌ emojis.
- **Input validation** keeps the game fair—no skipping levels!
- **Fully offline**—all images are local, no API calls required.
- **Celebratory finale**—finish all levels and get a balloon surprise!

---

## 🚀 How to Play

1. **Start the Campaign**  
   Use the sidebar to launch the game.

2. **Guess the Keywords**  
   For each level, observe the image and enter your guesses in the provided boxes. Each box corresponds to a single secret keyword.

3. **Submit & Review**  
   Click **Submit Guess** to check your answers. Feedback appears instantly, showing which guesses were correct.

4. **Advance Levels**  
   After each round, click **Next Level** to move forward. The game won’t let you skip rounds without making a guess.

5. **Celebrate Your Success**  
   Complete all 5 levels to see your final score and enjoy a confetti balloon celebration!

---

## 🖼️ Demo Campaign Levels

| Level | Name                      | Keywords                             |
|-------|---------------------------|--------------------------------------|
| 1     | The Basics                | dog, hat                             |
| 2     | Mix & Match               | bus, cheese                          |
| 3     | A Touch of Style          | lion, sunglasses, picasso            |
| 4     | Complex Scenes            | robot, coffee, forest                |
| 5     | The Abstract Challenge    | creativity, lightbulbs, library      |

All images should be placed in an `images/` folder, named as `level1.png`, `level2.png`, ..., `level5.png`.

---

## 🛠️ Setup & Run

1. **Install dependencies**
   ```
   pip install streamlit
   ```

2. **Organize images**
   ```
   images/
     level1.png
     level2.png
     level3.png
     level4.png
     level5.png
   ```

3. **Start the app**
   ```
   streamlit run app.py
   ```

---

## 📁 File Structure

```
DALL-E's Doodle Duel/
├── app.py           # Main Streamlit application
├── images/
│   ├── level1.png
│   ├── level2.png
│   ├── level3.png
│   ├── level4.png
│   └── level5.png
└── README.md        # You're reading it!
```

---

## 👏 Credits

Built with ❤️ for the buildathon by [Mehtab-24](https://github.com/Mehtab-24).

---

## 🏁 License

This project is open source and free to use for educational and non-commercial purposes.
