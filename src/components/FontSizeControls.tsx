import { usePrefs } from '../lib/PrefsContext'
import { FONT_STEPS } from '../lib/prefs'

export function FontSizeControls() {
  const { fontScale, biggerText, smallerText } = usePrefs()
  const atMin = fontScale === FONT_STEPS[0]
  const atMax = fontScale === FONT_STEPS[FONT_STEPS.length - 1]

  return (
    <div className="font-controls" role="group" aria-label="Tamaño de letra">
      <button
        type="button"
        className="font-controls__btn"
        onClick={smallerText}
        disabled={atMin}
        aria-label="Reducir tamaño de letra"
      >
        A−
      </button>
      <button
        type="button"
        className="font-controls__btn"
        onClick={biggerText}
        disabled={atMax}
        aria-label="Aumentar tamaño de letra"
      >
        A+
      </button>
    </div>
  )
}
