import io
import re
import chess
import chess.pgn
import chess.svg
import cairosvg

PGN_DATA = """
[Event "Live Chess"]
[Site "Chess.com"]
[Date "2026.10.08"]
[Round "?"]
[White "0fajarpurnama0"]
[Black "foda89"]
[Result "1-0"]
[TimeControl "900+10"]
[WhiteElo "1637"]
[BlackElo "1566"]
[Termination "0fajarpurnama0 won by resignation"]
[ECO "E60"]
[EndTime "8:03:00 GMT+0000"]
[Link "https://www.chess.com/game/live/184993010852?username=0fajarpurnama0&move=0"]

1. d4 {[%clk 0:15:05.9][%timestamp 41]} 1... d5 {[%clk 0:15:06.4][%timestamp
36]} 2. c4 {[%clk 0:15:13.8][%timestamp 21]} 2... c6 {[%clk
0:15:09.3][%timestamp 71]} 3. Nf3 {[%clk 0:15:08.7][%timestamp 151]} 3... Nf6
{[%clk 0:15:17.7][%timestamp 16]} 4. g3 {[%clk 0:15:14.7][%timestamp 40]} 4...
g6 {[%clk 0:15:23.2][%timestamp 45]} 5. Bg2 {[%clk 0:15:23.4][%timestamp 13]}
5... Bg7 {[%clk 0:15:31.7][%timestamp 15]} 6. O-O {[%clk 0:15:30.1][%timestamp
33]} 6... O-O {[%clk 0:15:40.8][%timestamp 9]} 7. Nc3 {[%clk
0:15:34.7][%timestamp 54]} 7... Re8 {[%clk 0:15:45.6][%timestamp 52]} 8. Qc2
{[%clk 0:13:23.7][%timestamp 1410]} 8... Bf5 {[%clk 0:15:16.4][%timestamp 392]}
9. Qb3 {[%clk 0:12:59.5][%timestamp 342]} 9... Qd7 {[%clk 0:13:30.2][%timestamp
1162]} 10. Ne5 {[%clk 0:11:51.7][%timestamp 778]} 10... dxc4 {[%clk
0:12:25.8][%timestamp 744]} 11. Qxc4 {[%clk 0:11:01.2][%timestamp 605]} 11...
Qc7 {[%clk 0:12:02.5][%timestamp 333]} 12. Qxf7+ {[%clk 0:09:25.5][%timestamp
1057]} 12... Kh8 {[%clk 0:12:04.4][%timestamp 81]} 13. Bf4 {[%clk
0:07:32.3][%timestamp 1232]} 13... Qc8 {[%clk 0:12:09][%timestamp 54]} 14. Qb3
{[%clk 0:06:10.7][%timestamp 916]} 14... Be6 {[%clk 0:12:02.7][%timestamp 163]}
15. d5 {[%clk 0:06:03.3][%timestamp 174]} 15... Nxd5 {[%clk
0:12:01.3][%timestamp 114]} 16. Nxd5 {[%clk 0:06:13.2][%timestamp 1]} 16... cxd5
{[%clk 0:09:02.8][%timestamp 1885]} 17. Bxd5 {[%clk 0:06:23.1][%timestamp 1]}
17... Bxd5 {[%clk 0:09:03.5][%timestamp 93]}18. Qxd5 {[%clk 0:06:33][%timestamp
1]} 18... e6 {[%clk 0:08:58.3][%timestamp 152]} 19. Qb3 {[%clk
0:04:50][%timestamp 1130]} 19... Kg8 {[%clk 0:08:29][%timestamp 393]} 20. Rac1
{[%clk 0:04:28.8][%timestamp 312]} 20... Qd8 {[%clk 0:08:28.7][%timestamp 103]}
21. Rfd1 {[%clk 0:04:06.5][%timestamp 323]} 21... Qe7 {[%clk
0:08:19.9][%timestamp 188]} 22. Rd3 {[%clk 0:01:58.4][%timestamp 1381]} 22...
Na6 {[%clk 0:08:24.2][%timestamp 57]} 23. Qc3 {[%clk 0:01:48][%timestamp 204]}
23... Rac8 {[%clk 0:08:23.3][%timestamp 109]} 24. Qxc8 {[%clk
0:01:49.4][%timestamp 86]} 24... Rxc8 {[%clk 0:08:31.7][%timestamp 16]} 25.
Rxc8+ {[%clk 0:01:59.3][%timestamp 1]} 25... Bf8 {[%clk 0:08:34.8][%timestamp
69]} 26. Rdd8 {[%clk 0:01:43.5][%timestamp 258]} 26... g5 {[%clk
0:07:01.6][%timestamp 1032]} 27. Rxf8+ {[%clk 0:01:40.1][%timestamp 134]} 27...
Kg7 {[%clk 0:07:10.1][%timestamp 15]} 28. Rf7+ {[%clk 0:01:30.2][%timestamp
199]} 28... Qxf7 {[%clk 0:07:17.6][%timestamp 25]} 29. Nxf7 {[%clk
0:01:40.1][%timestamp 1]} 29... gxf4 {[%clk 0:07:26.4][%timestamp 12]} 30. Nd6
{[%clk 0:01:41.1][%timestamp 90]} 30... fxg3 {[%clk 0:07:23.3][%timestamp 131]}
31. hxg3 {[%clk 0:01:51][%timestamp 1]} 31... b6 {[%clk 0:07:24.3][%timestamp
90]} 32. Ra8 {[%clk 0:01:49.6][%timestamp 114]} 32... Kf6 {[%clk
0:07:29.4][%timestamp 49]} 33. Rxa7 {[%clk 0:01:55.6][%timestamp 40]} 33... Nc5
{[%clk 0:07:38.3][%timestamp 11]} 34. Rxh7 {[%clk 0:02:01.2][%timestamp 44]}
34... Ke5 {[%clk 0:07:46.8][%timestamp 15]} 35. Nc4+ {[%clk
0:02:05.7][%timestamp 55]} 35... Kd4 {[%clk 0:07:51.7][%timestamp 51]} 36. Nxb6
{[%clk 0:02:15.6][%timestamp 1]} 36... e5 {[%clk 0:07:46.6][%timestamp 151]} 37.
Rh4+ {[%clk 0:02:13.2][%timestamp 124]} 37... e4 {[%clk 0:07:44.1][%timestamp
125]} 38. e3+ {[%clk 0:02:18.8][%timestamp 44]} 38... Kd3 {[%clk
0:07:49.2][%timestamp 49]} 39. b4 {[%clk 0:02:17.9][%timestamp 109]} 39... Na6
{[%clk 0:07:50][%timestamp 92]} 40. b5 {[%clk 0:02:19][%timestamp 89]} 40... Nb4
{[%clk 0:07:58.5][%timestamp 15]} 41. a4 {[%clk 0:02:27.8][%timestamp 12]} 41...
Na2 {[%clk 0:07:52.8][%timestamp 157]} 42. a5 {[%clk 0:02:26.3][%timestamp 115]}
42... Nc3 {[%clk 0:08:01.7][%timestamp 11]} 43. Rh5 {[%clk 0:02:33][%timestamp
33]} 43... Ne2+ {[%clk 0:07:58.6][%timestamp 131]} 44. Kg2 {[%clk
0:02:40.3][%timestamp 27]} 44... Nc3 {[%clk 0:07:52.2][%timestamp 164]} 45. a6
{[%clk 0:02:48.3][%timestamp 20]} 45... Ke2 {[%clk 0:07:52.3][%timestamp 99]}
46. a7 {[%clk 0:02:49.4][%timestamp 89]} 46... Nd1 {[%clk 0:08:01.6][%timestamp
7]} 47. Rf5 {[%clk 0:02:58.4][%timestamp 10]} 47... Nxe3+ {[%clk
0:08:07.9][%timestamp 37]} 48. fxe3 {[%clk 0:03:06.4][%timestamp 20]} 48... Kxe3
{[%clk 0:08:17.3][%timestamp 6]} 49. a8=Q {[%clk 0:03:11.3][%timestamp 51]}
49... Kd2 {[%clk 0:08:26.5][%timestamp 8]} 50. Qxe4 {[%clk 0:03:16.4][%timestamp
49]} 1-0
"""

def extract_duration(comment: str) -> float:
    """Extracts duration in seconds from Chess.com [%timestamp X] format."""
    # [%timestamp X] where X is in tenths of a second usually,
    # but let's assume it represents tenths for this specific parser.
    # Adjust multiplier if timestamp format is different.
    match = re.search(r'\[%timestamp (\d+)\]', comment)
    if match:
        val = int(match.group(1))
        return val / 10.0  # Converting to seconds
    return 1.0  # Fallback duration if missing

def generate_frames():
    game = chess.pgn.read_game(io.StringIO(PGN_DATA))
    board = game.board()
    
    with open("frames.txt", "w") as f:
        # Generate initial board state before Move 1
        svg_data = chess.svg.board(board=board, size=600)
        cairosvg.svg2png(bytestring=svg_data.encode('utf-8'), write_to="move_0.png")
        
        # We need the duration of the very first move (White's move 1) to hold the starting position
        first_move = game.next()
        initial_duration = extract_duration(first_move.comment)
        
        f.write("file 'move_0.png'\n")
        f.write(f"duration {initial_duration}\n")

        move_idx = 1
        node = game
        
        for next_node in game.mainline():
            board.push(next_node.move)
            
            # Save current board state
            img_filename = f"move_{move_idx}.png"
            # Optional: highlight the last move
            svg_data = chess.svg.board(board=board, lastmove=next_node.move, size=600)
            cairosvg.svg2png(bytestring=svg_data.encode('utf-8'), write_to=img_filename)
            
            # The duration this board state stays on screen is determined by the NEXT move's timestamp
            # If there is no next move, we just hold the final frame for a few seconds.
            if next_node.variations:
                following_node = next_node.variations[0]
                duration = extract_duration(following_node.comment)
            else:
                duration = 5.0 # Hold last frame for 5 seconds

            f.write(f"file '{img_filename}'\n")
            f.write(f"duration {duration}\n")
            
            move_idx += 1
            node = next_node
            
        # FFmpeg concat requires the last file to be specified again without a duration
        f.write(f"file 'move_{move_idx - 1}.png'\n")

    print(f"Generated {move_idx} frames and frames.txt")

if __name__ == "__main__":
    generate_frames()