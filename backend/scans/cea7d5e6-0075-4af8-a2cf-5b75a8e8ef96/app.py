import os
import streamlit as st

# --- Gemini-inspired CSS ---
st.markdown("""
<style>
    /* Main app background */
    .stApp { background-color: #0E1117; }
    /* Solid, bright titles */
    h1, h2, h3 { color: #00E5FF; font-weight: 700; }
    /* Sidebar styling */
    [data-testid="stSidebar"] { background-color: #1a1f2e; }
    /* Card-like containers on the main page */
    [data-testid="stVerticalBlock"] .st-emotion-cache-183lzff {
        border: 1px solid #2D3748;
        border-radius: 10px;
        padding: 20px;
        background-color: #1A202C;
    }
</style>
""", unsafe_allow_html=True)

# --- 5-Level Campaign Data ---
CAMPAIGN_LEVELS = [
    {"level_name": "Level 1: The Basics", "image_path": "images/level1.png", "keywords": ["dog", "hat"]},
    {"level_name": "Level 2: Mix & Match", "image_path": "images/level2.png", "keywords": ["bus", "cheese"]},
    {"level_name": "Level 3: A Touch of Style", "image_path": "images/level3.png", "keywords": ["lion", "sunglasses", "picasso"]},
    {"level_name": "Level 4: Complex Scenes", "image_path": "images/level4.png", "keywords": ["robot", "coffee", "forest"]},
    {"level_name": "Level 5: The Abstract Challenge", "image_path": "images/level5.png", "keywords": ["creativity", "lightbulbs", "library"]},
]
TOTAL_LEVELS = len(CAMPAIGN_LEVELS)
MAX_SCORE = sum(len(l["keywords"]) for l in CAMPAIGN_LEVELS)

# --- Session State Initialization ---
def init_state():
    ss = st.session_state
    if "score" not in ss: ss.score = 0
    if "current_level_index" not in ss: ss.current_level_index = 0
    if "level_answered" not in ss: ss.level_answered = False
    if "user_guesses" not in ss: ss.user_guesses = []
    if "feedback_rows" not in ss: ss.feedback_rows = []
    if "game_started" not in ss: ss.game_started = False

# --- Game Logic Functions ---
def reset_game():
    st.session_state.score = 0
    st.session_state.current_level_index = 0
    st.session_state.level_answered = False
    st.session_state.user_guesses = []
    st.session_state.feedback_rows = []
    st.session_state.game_started = True
    # Clear all input box values
    for k in list(st.session_state.keys()):
        if k.startswith("kw_"):
            del st.session_state[k]

def normalize(s):
    return "".join(ch.lower() for ch in s.strip() if ch.isalnum())

def score_level(guesses, keywords):
    # Order-insensitive, case-insensitive, each correct keyword counts once
    correct_norm = [normalize(k) for k in keywords]
    remaining = set(correct_norm)
    points = 0
    rows = []
    for i in range(max(len(guesses), len(keywords))):
        guess_raw = guesses[i].strip() if i < len(guesses) else ""
        correct_raw = keywords[i] if i < len(keywords) else ""
        guess_norm = normalize(guess_raw)
        ok = guess_norm in remaining and guess_norm != ""
        if ok:
            points += 1
            remaining.remove(guess_norm)
        rows.append({
            "idx": i+1,
            "guess": guess_raw if guess_raw else "—",
            "correct": correct_raw if correct_raw else "—",
            "ok": ok
        })
    return points, rows

def advance_level():
    st.session_state.current_level_index += 1
    st.session_state.level_answered = False
    st.session_state.user_guesses = []
    st.session_state.feedback_rows = []
    # Clear inputs for next level
    for k in list(st.session_state.keys()):
        if k.startswith("kw_"):
            del st.session_state[k]

# --- Initialize state ---
init_state()

# --- Sidebar ---
with st.sidebar:
    st.title("🎨 DALL-E's Doodle Duel")
    with st.expander("How to Play", expanded=False):
        st.markdown(
            "- This is a 5-level campaign with increasing difficulty.\n"
            "- Each level has an image and N keyword boxes (one per secret word).\n"
            "- Enter one keyword per box. Order doesn't matter.\n"
            "- Submit to check your answers (✅/❌).\n"
            "- You can't skip a level: guessing is required.\n"
            "- After a valid guess, click Next Level to continue.\n"
            "- Finish all levels to see your final score!"
        )
    st.metric("Total Score", st.session_state.score)
    finished = st.session_state.game_started and (st.session_state.current_level_index >= TOTAL_LEVELS)
    if not st.session_state.game_started:
        if st.button("🚀 Start Campaign", use_container_width=True):
            reset_game()
            st.experimental_rerun()
    else:
        if finished:
            if st.button("🔁 Play Again?", use_container_width=True):
                reset_game()
                st.experimental_rerun()
        else:
            if st.button("↩️ Restart Campaign", use_container_width=True):
                reset_game()
                st.experimental_rerun()

# --- Main Gameplay Area ---
st.title("DALL-E's Doodle Duel")
if not st.session_state.game_started:
    st.markdown("<div class='card'>", unsafe_allow_html=True)
    st.subheader("Welcome!")
    st.write("Use the sidebar to read the rules, check your score, and press Start Campaign.")
    st.markdown("</div>", unsafe_allow_html=True)
else:
    # End-of-campaign screen
    if st.session_state.current_level_index >= TOTAL_LEVELS:
        st.markdown("<div class='card'>", unsafe_allow_html=True)
        st.header("Campaign Complete!")
        st.balloons()
        st.markdown(
            f"<div style='font-size:1.18rem;font-weight:800;color:#00E5FF;'>Final Score: {st.session_state.score} / {MAX_SCORE}</div>",
            unsafe_allow_html=True
        )
        st.write("Congrats! Use Play Again? in the sidebar to replay.")
        st.markdown("</div>", unsafe_allow_html=True)
    else:
        # Active level
        level = CAMPAIGN_LEVELS[st.session_state.current_level_index]
        level_name = level["level_name"]
        image_path = level["image_path"]
        keywords = level["keywords"]
        n_kw = len(keywords)

        st.markdown("<div class='card'>", unsafe_allow_html=True)
        st.subheader(level_name)

        # Image display (centered)
        img_cols = st.columns([1, 2, 1])
        with img_cols[1]:
            if os.path.exists(image_path):
                st.image(image_path, use_column_width=True)
            else:
                st.warning("Image not found at the expected path. Please add the image to your project:")
                st.code(image_path)

        # Structured input boxes
        st.markdown("<div class='label'>Enter Your Guesses</div>", unsafe_allow_html=True)
        input_cols = st.columns(n_kw)
        guesses = []
        idx = st.session_state.current_level_index
        for i, c in enumerate(input_cols):
            with c:
                g = st.text_input(f"Keyword {i+1}", key=f"kw_{i}_{idx}")
                guesses.append(g)

        # Submission & validation
        submit_btn = st.button("✅ Submit Guess", type="primary", disabled=st.session_state.level_answered)
        if submit_btn and not st.session_state.level_answered:
            all_empty = all(g.strip() == "" for g in guesses)
            if all_empty:
                msg = "Nice try, but you have to actually guess something!"
                try:
                    st.toast(msg)
                except Exception:
                    st.warning(msg)
            else:
                points, rows = score_level(guesses, keywords)
                st.session_state.score += points
                st.session_state.user_guesses = guesses
                st.session_state.feedback_rows = rows
                st.session_state.level_answered = True

        st.markdown("</div>", unsafe_allow_html=True)

        # Results Feedback Card
        if st.session_state.level_answered:
            st.markdown("<div class='card'>", unsafe_allow_html=True)
            st.markdown("<div class='label'>Feedback</div>", unsafe_allow_html=True)
            h1, h2, h3, h4 = st.columns([0.6, 2.2, 2.2, 0.9])
            with h1: st.markdown("**#**")
            with h2: st.markdown("**Your Guess**")
            with h3: st.markdown("**Correct Keyword**")
            with h4: st.markdown("**Result**")
            for r in st.session_state.feedback_rows:
                c1, c2, c3, c4 = st.columns([0.6, 2.2, 2.2, 0.9])
                with c1: st.write(r["idx"])
                with c2: st.write(r["guess"])
                with c3: st.write(r["correct"])
                with c4: st.write("✅" if r["ok"] else "❌")
            st.success(
                f"Round Score: {sum(r['ok'] for r in st.session_state.feedback_rows)}  |  Total Score: {st.session_state.score}"
            )
            st.markdown("</div>", unsafe_allow_html=True)

        # Next Level Button (only if answered)
        if st.session_state.level_answered:
            is_last = (st.session_state.current_level_index == TOTAL_LEVELS - 1)
            next_label = "🏁 Finish Campaign" if is_last else "➡️ Next Level"
            if st.button(next_label):
                if is_last:
                    st.session_state.current_level_index += 1  # triggers campaign complete view
                    st.experimental_rerun()
                else:
                    advance_level()
                    st.experimental_rerun()