# enzomtp Radio • OBS Now Playing Widget

A compact browser-source widget for OBS that auto-plays your radio stream, shows the current track with artwork, listeners, and a smooth progress bar, and automatically reconnects if the stream stalls.

## Files

- `index.html` — Widget markup and audio element
- `style.css` — Compact, glassy theme styled to match enzomtp.party
- `script.js` — Player, polling, reconnect logic, and UI updates

## OBS Setup

1. OBS ➜ Sources ➜ + ➜ Browser ➜ Create New
2. Set URL to `https://radiowidget.enzomtp.party/obs-radio`
3. Suggested size:
   - Width: 320 (adjust to your layout)
   - Height: 85
4. Enable:
   - “Control audio via OBS” (so you can mix/mute the radio)
   - “Refresh browser when scene becomes active” (optional)
   - “Refresh browser when inactive” (optional)
   - “Shutdown source when not visible” (optional)
   - “Allow transparency” (important for overlay)
5. Custom CSS: leave empty or ensure it does not set a background. If needed:
   ```css
   html, body { background: rgba(0, 0, 0, 0) !important; margin: 0 !important; }
   ```

## Customization

```css
:root {
  --bg: rgba(58, 48, 68, 0.75); /* card background */
  --fg: #ffffff;                /* primary text */
  --muted: #c9c6d6;             /* secondary text */
  --accent: #9146ff;            /* accent color */
}
```

Other quick tweaks:
- Progress bar thickness: `.progress { height: 6px; }`
- Full-width progress bar offsets: `.progress { left/right/bottom }`
- Title/artist font sizes: `.title`, `.artist`

## Behavior Details

- Autoplay and reconnects
  - Initial buffering grace: 15s before considering stalled
  - After first successful playback: 6s stall threshold
  - Exponential backoff reconnects: 1s, 2s, 4s, 8s
  - On reconnect, the stream URL is cache-busted to force a fresh connection
- Now Playing polling
  - Polls every 10 seconds
  - Only updates title/artist/art when the track actually changes (using `sh_id`)
  - Listeners count updates each poll
- Artwork & HTTPS
  - Artwork URLs from API are upgraded to HTTPS if needed (to avoid mixed-content issues)
- Progress bar
  - Smooth animation via `requestAnimationFrame` and `transform: scaleX(pct)`
  - Hides if duration isn’t provided by the API

## Credits

- Station: [enzomtp’s Radio](https://radio.enzomtp.party)