import io
import math
import os
import re
import chess
import chess.engine
import chess.pgn
import chess.svg
import cairosvg
from PIL import Image, ImageDraw, ImageFont

# Configuration
PGN_FILE = "game.pgn"
OUTPUT_DIR = "output_frames"
STOCKFISH_PATH = "/usr/games/stockfish"
DEFAULT_MOVE_DURATION = 1.0  # Fallback duration if no timing metadata exists
MIN_MOVE_DURATION = 0.2      # Minimum display time for pre-moves/instant moves

def parse_time_control(tc_header: str) -> tuple[float | None, float]:
    """Parses TimeControl header (e.g., '300' or '900+10') into (base_seconds, increment)."""
    if not tc_header or tc_header == "?":
        return None, 0.0
    
    parts = tc_header.split("+")
    try:
        base = float(parts[0])
    except ValueError:
        base = None
        
    inc = 0.0
    if len(parts) > 1:
        try:
            inc = float(parts[1])
        except ValueError:
            inc = 0.0
            
    return base, inc

def parse_clock(comment: str) -> float | None:
    """Parses [%clk HH:MM:SS] or [%clk H:MM:SS.s] into total seconds."""
    match = re.search(r'\[%clk\s+(\d+):(\d+):(\d+(?:\.\d+)?)\]', comment)
    if match:
        h, m, s = match.groups()
        return int(h) * 3600 + int(m) * 60 + float(s)
    return None

def parse_timestamp(comment: str) -> float | None:
    """Parses [%timestamp X] (tenths of a second) into total seconds."""
    match = re.search(r'\[%timestamp\s+(\d+)\]', comment)
    if match:
        return int(match.group(1)) / 10.0
    return None

def calculate_move_duration(node, turn: chess.Color, prev_clocks: dict, increment: float) -> float:
    """Calculates move duration using %timestamp, %clk delta, or fallback."""
    comment = node.comment or ""
    curr_clk = parse_clock(comment)
    ts = parse_timestamp(comment)
    
    # Calculate clock difference if %clk is available
    prev_clk = prev_clocks[turn]
    clk_duration = None
    if curr_clk is not None:
        if prev_clk is not None:
            clk_duration = prev_clk - curr_clk + increment
        # Update baseline clock for this player
        prev_clocks[turn] = curr_clk

    # Priority 1: %timestamp tag
    if ts is not None:
        return max(ts, MIN_MOVE_DURATION)

    # Priority 2: %clk delta calculation
    if clk_duration is not None:
        return max(clk_duration, MIN_MOVE_DURATION)

    # Priority 3: Default fallback
    return DEFAULT_MOVE_DURATION

def cp_to_win_percent(cp: int) -> float:
    return 50 + 50 * (2 / (1 + math.exp(-0.003682 * cp)) - 1)

def evaluate_position(board, engine) -> tuple[float, str]:
    info = engine.analyse(board, chess.engine.Limit(time=0.03))
    score = info["score"].white()
    
    if score.is_mate():
        mate = score.mate()
        win_pct = 100.0 if mate > 0 else 0.0
        text = f"M{abs(mate)}" if mate > 0 else f"-M{abs(mate)}"
    else:
        cp = score.score()
        win_pct = cp_to_win_percent(cp)
        val = cp / 100.0
        text = f"+{val:.1f}" if val >= 0 else f"{val:.1f}"
        
    return win_pct, text

def render_frame_with_bar(svg_data: str, win_pct: float, eval_text: str, output_path: str):
    board_png = cairosvg.svg2png(bytestring=svg_data.encode('utf-8'))
    board_img = Image.open(io.BytesIO(board_png))
    
    board_w, board_h = board_img.size
    bar_width = 32
    margin = 8
    total_w = board_w + bar_width + (margin * 3)
    total_h = board_h
    
    canvas = Image.new("RGBA", (total_w, total_h), (30, 30, 30, 255))
    canvas.paste(board_img, (bar_width + margin * 2, 0))
    
    draw = ImageDraw.Draw(canvas)
    x0, y0 = margin, margin
    x1, y1 = margin + bar_width, total_h - margin
    bar_height = y1 - y0
    
    white_h = int(bar_height * (win_pct / 100.0))
    
    draw.rectangle([x0, y0, x1, y1], fill=(45, 45, 45))
    draw.rectangle([x0, y1 - white_h, x1, y1], fill=(235, 235, 235))
    draw.rectangle([x0, y0, x1, y1], outline=(120, 120, 120), width=1)
    
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 11)
    except OSError:
        font = ImageFont.load_default()
        
    text_color = (10, 10, 10) if win_pct > 50 else (240, 240, 240)
    text_y = y1 - white_h - 14 if win_pct > 50 else y0 + 4
    text_y = max(y0 + 2, min(text_y, y1 - 14))
    
    draw.text((x0 + 2, text_y), eval_text, fill=text_color, font=font)
    canvas.save(output_path)

def main():
    if not os.path.exists(PGN_FILE):
        print(f"Error: {PGN_FILE} not found!")
        return

    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    with open(PGN_FILE, "r", encoding="utf-8", errors="ignore") as f:
        game = chess.pgn.read_game(f)
        
    if not game:
        print(f"Error: Unable to parse PGN from {PGN_FILE}")
        return

    # Parse initial clock and increment from PGN headers
    tc_header = game.headers.get("TimeControl", "")
    base_time, increment = parse_time_control(tc_header)
    
    prev_clocks = {
        chess.WHITE: base_time,
        chess.BLACK: base_time
    }

    engine = chess.engine.SimpleEngine.popen_uci(STOCKFISH_PATH)
    board = game.board()
    
    print(f"Processing {PGN_FILE} (TimeControl: '{tc_header}')...")
    frames_txt_path = os.path.join(OUTPUT_DIR, "frames.txt")
    
    with open(frames_txt_path, "w") as f:
        # Move 0 (Initial Position)
        win_pct, eval_text = evaluate_position(board, engine)
        svg_data = chess.svg.board(board=board, size=600)
        render_frame_with_bar(svg_data, win_pct, eval_text, os.path.join(OUTPUT_DIR, "move_0.png"))
        
        first_move = game.next()
        initial_duration = (
            calculate_move_duration(first_move, chess.WHITE, prev_clocks, increment)
            if first_move else DEFAULT_MOVE_DURATION
        )
        
        f.write("file 'move_0.png'\n")
        f.write(f"duration {initial_duration:.2f}\n")
        
        move_idx = 1
        for next_node in game.mainline():
            board.push(next_node.move)
            
            win_pct, eval_text = evaluate_position(board, engine)
            svg_data = chess.svg.board(board=board, lastmove=next_node.move, size=600)
            
            img_filename = f"move_{move_idx}.png"
            render_frame_with_bar(svg_data, win_pct, eval_text, os.path.join(OUTPUT_DIR, img_filename))
            
            if next_node.variations:
                following_node = next_node.variations[0]
                turn = board.turn # Color of player who will make the FOLLOWING move
                duration = calculate_move_duration(following_node, turn, prev_clocks, increment)
            else:
                duration = 5.0 # Final position hold time
                
            f.write(f"file '{img_filename}'\n")
            f.write(f"duration {duration:.2f}\n")
            move_idx += 1
            
        f.write(f"file 'move_{move_idx - 1}.png'\n")
        
    engine.quit()
    print(f"Done! {move_idx} frames generated in '{OUTPUT_DIR}/'.")

if __name__ == "__main__":
    main()