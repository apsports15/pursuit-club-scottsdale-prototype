// @ts-nocheck
/*
 * Club Scottsdale · Pursuit 05 / The ecosystem — Framer code component
 *
 * GENERATED FILE. Do not edit by hand: it is assembled by framer-export/scripts/build.mjs
 * from the approved build (index.html, css/club.css, js/club.js by way of
 * framer-export/src/engine.js, public/media/club-scottsdale/manifest.js,
 * vendor/gsap.min.js, assets/fonts) and framer-export/src/component.tsx.
 * __BUILD_INFO__
 *
 * Paste this whole file into a Framer code file named ClubScottsdaleChapter.tsx.
 * Set "Media URL" to the hosted media folder (see framer-export/README.md).
 */
import * as React from "react"
import { addPropertyControls, ControlType, RenderTarget } from "framer"

const APPLY_URL = "https://apply.thepursuitpath.com/"
// Where the film's videos and images are hosted (README, section 4). It is the default of the
// "Media URL" property, so the film works as soon as it is placed; change it in the properties
// panel to move the media (for example to Cloudflare Pages).
const MEDIA_URL = "https://apsports15.github.io/pursuit-club-scottsdale-prototype/public/media/club-scottsdale/"

/* The approved stylesheet, namespaced under .pursuit-club-chapter. */
const STYLE = __STYLE__

/* The approved fonts (assets/fonts: Bodoni Moda 400 and 400 italic, Outfit 300/400/500), with
   the approved @font-face descriptors. They are added to the page when the film mounts, so they
   are not part of the page's HTML; the film stays hidden until they are in. */
const FONTS = __FONTS__

/* The approved markup: the skip link and the film section from index.html. */
const FILM_HTML = __FILM_HTML__

/* public/media/club-scottsdale/manifest.js */
const MEDIA = __MEDIA__

__GSAP__

__ENGINE__

let fontsReady = null
function loadFonts() {
    if (fontsReady) return fontsReady
    const d = document
    if (typeof FontFace !== "undefined" && d.fonts && d.fonts.add) {
        fontsReady = Promise.all(
            FONTS.map((f) => {
                const face = new FontFace(f.family, f.src, { weight: f.weight, style: f.style, display: f.display })
                d.fonts.add(face)
                return face.load().catch(() => null)
            })
        )
    } else {
        const el = d.createElement("style")
        el.textContent = FONTS.map((f) => `@font-face{font-family:"${f.family}";src:${f.src};font-weight:${f.weight};font-style:${f.style};font-display:${f.display}}`).join("\n")
        d.head.appendChild(el)
        fontsReady = Promise.resolve()
    }
    return fontsReady
}

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
function normalizeBase(url) {
    const u = String(url || "").trim()
    if (!u) return ""
    return u.endsWith("/") ? u : u + "/"
}
// Until the Media URL is set, the cover requests nothing (a blank pixel instead of a broken image).
const BLANK = "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw=="
function markup(base, apply, note) {
    let film = FILM_HTML
    if (!base) film = film.replace(/ srcset="__BASE__[^"]*"/g, "").replace(/ src="__BASE__[^"]*"/g, ' src="' + BLANK + '"')
    film = film.split("__BASE__").join(esc(base)).split("__APPLY__").join(esc(apply || APPLY_URL))
    const hint = note
        ? '<div style="position:absolute;z-index:99;left:16px;top:16px;padding:8px 12px;background:#ECE9E3;color:#000;font:500 12px/1.3 sans-serif">Set “Media URL” in the properties panel to the hosted media folder.</div>'
        : ""
    return "<style>" + STYLE + "</style>" + film + hint
}
function isStaticTarget() {
    const T = RenderTarget
    const now = T.current()
    return [T.canvas, T.thumbnail, T.export].filter(Boolean).indexOf(now) !== -1
}
// On the Framer canvas the film does not run: it shows its opening screen, laid out for
// the width it is given (the live site decides this from the viewport).
function previewLayout(host) {
    if (typeof ResizeObserver === "undefined") return
    const ro = new ResizeObserver(() => {
        const w = host.clientWidth, h = host.clientHeight || 1
        host.classList.toggle("wide", w >= 900 && w / h >= 1.05)
    })
    ro.observe(host)
    return () => ro.disconnect()
}

/**
 * The Club Scottsdale chapter: a guided film that runs as one section of the page.
 * Width: Fill. Height: Fit (the component is always one viewport tall).
 *
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 * @framerIntrinsicWidth 1200
 * @framerIntrinsicHeight 800
 */
export default function ClubScottsdaleChapter(props) {
    const { assetBase = MEDIA_URL, applyUrl = APPLY_URL, hideSiteHeader = true, headerSelector = "" } = props
    const base = normalizeBase(assetBase)
    // The canvas preview is decided after mount, so the server-rendered HTML of the live page
    // never depends on where it was rendered (hydration always matches).
    const [still, setStill] = React.useState(false)
    React.useEffect(() => setStill(isStaticTarget()), [])
    const html = React.useMemo(() => markup(base, applyUrl, still && !base), [base, applyUrl, still])
    const ref = React.useRef(null)
    React.useEffect(() => {
        const host = ref.current
        if (!host) return
        // Show the film once its fonts are in (or after 1.2 s, as the prototype waited at most).
        const fonts = loadFonts()
        let on = true
        const show = () => on && host.classList.add("pcc-type")
        fonts.then(show)
        const wait = setTimeout(show, 1200)
        const done = () => { on = false; clearTimeout(wait) }
        if (isStaticTarget()) {
            const stop = previewLayout(host)
            return () => { done(); if (stop) stop() }
        }
        if (!base) {
            console.warn("[ClubScottsdaleChapter] Set the Media URL property to the hosted media folder.")
            return done
        }
        const film = mountFilm(host, {
            gsap: loadGsap(),
            media: MEDIA,
            base,
            fonts,
            hideHeader: hideSiteHeader,
            headerSelector: String(headerSelector || "").trim(),
        })
        return () => { done(); film.destroy() }
    }, [html, still, hideSiteHeader, headerSelector])
    return (
        <div
            ref={ref}
            lang="en"
            className={still ? "pursuit-club-chapter pcc pcc-live" : "pursuit-club-chapter pcc"}
            dangerouslySetInnerHTML={{ __html: html }}
        />
    )
}

addPropertyControls(ClubScottsdaleChapter, {
    assetBase: {
        type: ControlType.String,
        title: "Media URL",
        defaultValue: MEDIA_URL,
        placeholder: "https://…/club-scottsdale/",
        description: "The folder where the film's videos and images are hosted.",
    },
    applyUrl: {
        type: ControlType.String,
        title: "Apply URL",
        defaultValue: APPLY_URL,
    },
    hideSiteHeader: {
        type: ControlType.Boolean,
        title: "Site header",
        defaultValue: true,
        enabledTitle: "Hide in film",
        disabledTitle: "Always show",
    },
    headerSelector: {
        type: ControlType.String,
        title: "Header selector",
        defaultValue: "",
        placeholder: "Automatic",
        description: "Leave empty: the fixed header at the top of the page is found automatically.",
    },
})
