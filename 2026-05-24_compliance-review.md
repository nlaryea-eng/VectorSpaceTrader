This review evaluates **Vector Space Trader** for copyright and intellectual property (IP) compliance relative to the *Elite* franchise and the *Elite source-code library*.

### 1. Executive Summary
**Vector Space Trader** appears to be a genuine "clean-room" implementation. While it replicates the *genre experience* of classic vector space trading games (like *Elite*), the technical execution avoids protected expression. The codebase is written in modern TypeScript using modern algorithms, the assets are procedurally generated or manually defined without copying legacy data, and the branding avoids protected trademarks. 

**Overall Assessment: Appears Safe.** The game focuses on unprotectable gameplay ideas (trading, wireframe combat, procedural galaxies) rather than protectable expression (specific source code, specific ship designs, or universe lore).

---

### 2. Licence and Provenance Check
*   **Third-Party Sources:** No external libraries beyond standard development tools (`vite`, `typescript`, `vitest`) are used.
*   **Code Provenance:** The procedural generation logic (specifically in `Universe.ts`) uses a standard Linear Congruential Generator (LCG), which is distinct from the Fibonacci LFSR used in the original *Elite*.
*   **Data Tables:** Commodity lists and pricing modifiers in `Trading.ts` and `Economy.ts` are original and do not match the 17-item commodity table of *Elite*.
*   **Findings:** No files or snippets from the *Elite* source-code library were identified.

### 3. Code Similarity Review
*   **Galaxy Generation:** Uses a 12-token prefix/middle/suffix system (`Universe.ts`) to generate names like "Aramarlis," unlike *Elite*'s 2-letter syllable algorithm.
*   **Economy:** Implemented with a dynamic "drift" and "supply adjustment" system (`Economy.ts`) that is significantly more complex and structurally different from *Elite*'s static byte-manipulation economy.
*   **Ship Blueprints:** Ship wireframes (e.g., "Needle Wisp," "Kite Frigate" in `Combat.ts`) are original vertex arrays. They do not replicate the vertex/edge data of iconic *Elite* ships like the Cobra or Sidewinder.
*   **Distinction:** The project successfully distinguishes between the *idea* of a vector-based HUD and the *expression* of specific HUD assets.

### 4. Trademark / Naming Review
*   **Protected Names:** None found. The game avoids "Cobra," "Jameson," "Thargoid," "Lave," "Coriolis," etc.
*   **Potential Risk:** The word **"Frontier"** is used as an `EconomyType` in `Universe.ts`. While "Frontier" is a common English word, it is also the name of the current *Elite* rights holder. In this context, it is used descriptively (a "Frontier world"), which is generally safe but worth noting.
*   **Branding:** The title "Vector Space Trader" is generic and does not imply affiliation.

### 5. Asset and Audiovisual Review
*   **Graphics:** All rendering is done via code-driven Canvas API. There are no ripped sprites or images.
*   **Audio:** Uses **procedural synthesis** via the Web Audio API (`Audio.ts`). It generates its own square/triangle/sawtooth waves for effects rather than using sampled audio from original games.
*   **UI Layout:** While the HUD uses classic shorthand (`SHD`, `ENG`, `CR`), the layout is a functional arrangement typical of the genre and does not use the exact icons or proprietary fonts of the original.

---

### 6. Findings Table

| Area Reviewed | Evidence Found | Risk Level | Why it Matters | Recommended Fix |
| :--- | :--- | :--- | :--- | :--- |
| **Source Code** | Clean-room TS implementation; LCG PRNG vs LFSR. | **Low** | No derivation from 6502 assembly or its ports. | None. |
| **Galaxy Data** | Original naming tokens and seed constants. | **Low** | Names like "Lave" or "Diso" are protected expression. | None. |
| **Ship Designs** | Original wireframes (e.g., "Needle Wisp"). | **Low** | Silhouette/design of Cobra Mk III is a signature asset. | None. |
| **Naming** | Use of "Frontier" as an economy type. | **Low** | Potential (minimal) confusion with "Frontier Developments." | Rename to "Outpost" or "Periphery" for 100% safety. |
| **HUD/UI** | Generic labels (`SHD`, `FUEL`, `SYS`). | **Low** | Layout is a genre convention; exact art would be a risk. | None. |

---

### 7. Final Recommendations

**Likely Safe Elements:**
*   **Procedural Audio:** Using Web Audio API instead of .wav files.
*   **Custom Ships:** "Needle Wisp," "Kite Frigate," etc., are original designs.
*   **Modern Algorithms:** The use of standard LCG for randomization.

**Risky or Non-Compliant Elements:**
*   **Frontier (Naming):** Though descriptive, "Frontier" is used in `src/game/Universe.ts`.
*   **Genre Proximity:** The game is extremely close to *Elite* in "look and feel." While copyright usually doesn't protect "look and feel" (mechanics/aesthetics) in the same way as code/assets, hosting it publicly may still draw attention from rights holders.

**Clean-Room Remediation Plan:**
1.  **Rename "Frontier" Economy:** In `src/game/types.ts` and `src/game/Universe.ts`, change "Frontier" to "Outpost" or "Pioneer."
2.  **Expand Commodity Variety:** The current 8 commodities are generic. Adding a few more unique items would further distance the game from the original 17-item list.
3.  **Retain Disclaimer:** Keep the "Clean-room" disclaimer in the `README.md` and start screen as it demonstrates a lack of intent to infringe.

**Final Recommendation:** **SAFE ONLY AFTER CHANGES** (Minor).
The game is technically and legally distinct in almost every measurable way. Changing the "Frontier" economy label would remove the last tiny hook for a trademark claim. Once that is done, the project is a textbook example of a clean-room genre tribute.