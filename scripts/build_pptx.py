"""Generate JanSetu_AI_Presentation.pptx from the same content as presentation.html.

Usage:  python scripts/build_pptx.py
Output: JanSetu_AI_Presentation.pptx (in repo root)
"""
from __future__ import annotations

from pathlib import Path

from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.util import Inches, Pt

# --- Colors (matches CSS custom properties in presentation.html) ---
BG_SLATE_950 = RGBColor(0x02, 0x06, 0x17)
BG_SLATE_900 = RGBColor(0x0F, 0x17, 0x2A)
BG_SLATE_800 = RGBColor(0x1E, 0x29, 0x3B)
BORDER_SLATE = RGBColor(0x33, 0x41, 0x55)
TEXT_SLATE = RGBColor(0xCB, 0xD5, 0xE1)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)

BRAND_TEAL = RGBColor(0x14, 0xB8, 0xA6)
BRAND_EMERALD = RGBColor(0x10, 0xB9, 0x81)
BRAND_ORANGE = RGBColor(0xF9, 0x73, 0x16)
BRAND_SKY = RGBColor(0x38, 0xBD, 0xF8)
BRAND_AMBER = RGBColor(0xF5, 0x9E, 0x0B)

SLIDE_W = Inches(13.333)
SLIDE_H = Inches(7.5)

# --- Fonts ---
FONT_HEAD = "Segoe UI Semibold"
FONT_BODY = "Segoe UI"
FONT_MONO = "Consolas"


def new_presentation() -> Presentation:
    prs = Presentation()
    prs.slide_width = SLIDE_W
    prs.slide_height = SLIDE_H
    return prs


def blank_slide(prs: Presentation):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    bg = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, SLIDE_W, SLIDE_H)
    bg.fill.solid()
    bg.fill.fore_color.rgb = BG_SLATE_950
    bg.line.fill.background()
    return slide


def add_pill(slide, text: str, color: RGBColor, y: float = 0.4, x: float = 0.6):
    tb = slide.shapes.add_textbox(Inches(x), Inches(y), Inches(4), Inches(0.35))
    tf = tb.text_frame
    tf.margin_top = 0
    tf.margin_bottom = 0
    p = tf.paragraphs[0]
    p.text = text
    r = p.runs[0]
    r.font.name = FONT_MONO
    r.font.size = Pt(11)
    r.font.bold = True
    r.font.color.rgb = color
    r.font.italic = False
    return tb


def add_heading(slide, text: str, y: float = 0.95, x: float = 0.6, width: float = 12, size: int = 38, color: RGBColor = WHITE, bold: bool = True):
    tb = slide.shapes.add_textbox(Inches(x), Inches(y), Inches(width), Inches(1.0))
    tf = tb.text_frame
    tf.margin_top = 0
    tf.margin_bottom = 0
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.text = text
    r = p.runs[0]
    r.font.name = FONT_HEAD
    r.font.size = Pt(size)
    r.font.bold = bold
    r.font.color.rgb = color
    return tb


def add_paragraph(slide, text: str, y: float, x: float = 0.6, width: float = 12, size: int = 14, color: RGBColor = TEXT_SLATE, bold: bool = False, align=None, font: str = FONT_BODY):
    tb = slide.shapes.add_textbox(Inches(x), Inches(y), Inches(width), Inches(1.5))
    tf = tb.text_frame
    tf.margin_top = 0
    tf.margin_bottom = 0
    tf.word_wrap = True
    p = tf.paragraphs[0]
    if align is not None:
        p.alignment = align
    p.text = text
    r = p.runs[0]
    r.font.name = font
    r.font.size = Pt(size)
    r.font.bold = bold
    r.font.color.rgb = color
    return tb


def add_card(slide, x: float, y: float, w: float, h: float, title: str, body: str, accent: RGBColor = BRAND_TEAL):
    card = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(x), Inches(y), Inches(w), Inches(h))
    card.fill.solid()
    card.fill.fore_color.rgb = BG_SLATE_900
    card.line.color.rgb = BORDER_SLATE
    card.line.width = Pt(0.75)

    tb = slide.shapes.add_textbox(Inches(x + 0.2), Inches(y + 0.15), Inches(w - 0.4), Inches(h - 0.3))
    tf = tb.text_frame
    tf.word_wrap = True
    tf.margin_top = 0
    tf.margin_bottom = 0

    p1 = tf.paragraphs[0]
    p1.text = title
    r1 = p1.runs[0]
    r1.font.name = FONT_HEAD
    r1.font.size = Pt(15)
    r1.font.bold = True
    r1.font.color.rgb = accent

    p2 = tf.add_paragraph()
    p2.text = body
    r2 = p2.runs[0]
    r2.font.name = FONT_BODY
    r2.font.size = Pt(11)
    r2.font.color.rgb = TEXT_SLATE
    p2.space_before = Pt(4)


def add_stat(slide, x: float, y: float, w: float, h: float, number: str, label: str, color: RGBColor = BRAND_TEAL):
    card = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(x), Inches(y), Inches(w), Inches(h))
    card.fill.solid()
    card.fill.fore_color.rgb = BG_SLATE_900
    card.line.color.rgb = BORDER_SLATE
    card.line.width = Pt(0.75)

    tb = slide.shapes.add_textbox(Inches(x), Inches(y + 0.15), Inches(w), Inches(h - 0.3))
    tf = tb.text_frame
    tf.word_wrap = True
    tf.margin_top = 0
    tf.margin_bottom = 0

    p1 = tf.paragraphs[0]
    p1.alignment = PP_ALIGN.CENTER
    p1.text = number
    r1 = p1.runs[0]
    r1.font.name = FONT_MONO
    r1.font.size = Pt(32)
    r1.font.bold = True
    r1.font.color.rgb = color

    p2 = tf.add_paragraph()
    p2.alignment = PP_ALIGN.CENTER
    p2.text = label
    r2 = p2.runs[0]
    r2.font.name = FONT_BODY
    r2.font.size = Pt(9)
    r2.font.color.rgb = TEXT_SLATE
    r2.font.bold = True
    p2.space_before = Pt(4)


# --- Slide builders ---

def slide_title(prs):
    slide = blank_slide(prs)
    add_pill(slide, "INDIA DPI · DIGITAL PUBLIC GOOD", BRAND_ORANGE, y=2.3, x=4.5)
    tb = slide.shapes.add_textbox(Inches(0), Inches(2.8), SLIDE_W, Inches(1.5))
    tf = tb.text_frame
    p = tf.paragraphs[0]
    p.alignment = PP_ALIGN.CENTER
    p.text = "JanSetu AI"
    r = p.runs[0]
    r.font.name = FONT_HEAD
    r.font.size = Pt(88)
    r.font.bold = True
    r.font.color.rgb = BRAND_TEAL

    add_paragraph(
        slide,
        "Multilingual AI platform aligning citizen infrastructure needs with government capital.",
        y=4.6, x=1, width=11.3, size=20, color=TEXT_SLATE, align=PP_ALIGN.CENTER,
    )
    add_paragraph(
        slide,
        "Voice-first  ·  22 Indian languages  ·  Live on Google Cloud",
        y=6.4, x=1, width=11.3, size=12, color=BORDER_SLATE, align=PP_ALIGN.CENTER, font=FONT_MONO,
    )


def slide_problem(prs):
    slide = blank_slide(prs)
    add_pill(slide, "THE GAP", BRAND_ORANGE)
    add_heading(slide, "Two Indias never meet.")
    add_card(slide, x=0.6, y=2.3, w=6, h=3.5,
             title="1.4 billion citizens",
             body="Speak 22+ languages. Report infrastructure issues in Hindi voice notes, Tamil SMS, missed calls — through channels they already trust.",
             accent=BRAND_ORANGE)
    add_card(slide, x=6.75, y=2.3, w=6, h=3.5,
             title="₹4.5 lakh Cr PFMS budget",
             body="NITI Aayog, State DMs, scheme secretaries — sit above dashboards of 15 districts, 6 sectors, 8 schemes. But they can't see what any village actually needs today.",
             accent=BRAND_SKY)
    add_paragraph(slide, "→ Complaints die on WhatsApp. Money dies as \"unspent PFMS funds\" on Q4 reports.",
                  y=6.3, x=0.6, width=12.1, size=16, color=BRAND_AMBER, bold=True, align=PP_ALIGN.CENTER)


def slide_solution(prs):
    slide = blank_slide(prs)
    add_pill(slide, "THE BRIDGE", BRAND_EMERALD)
    add_heading(slide, "JanSetu AI = Citizen ↔ AI ↔ Sanction")
    steps = [
        ("1 · Ingest anywhere", "WhatsApp, Telegram, SMS, IVR (missed call), USSD, Web. Voice or text, any language.", BRAND_TEAL),
        ("2 · Understand with Gemini", "Translate, transcribe, classify category, extract district, score urgency — one pipeline.", BRAND_EMERALD),
        ("3 · Rank with Priority Index", "Weighted formula fusing demand + infra deficit + vulnerability. Real-time on slider drag.", BRAND_ORANGE),
        ("4 · Recommend + sanction", "AI matches districts to schemes → policymaker signs off in one click → funds allocated.", BRAND_SKY),
        ("5 · Nudge the citizen", "The exact person who reported it gets a Telegram DM: \"Your request is now a ₹8 Cr project.\"", BRAND_AMBER),
        ("6 · Verify by satellite", "Pre/post ISRO imagery + AI verification score close the accountability loop.", BRAND_TEAL),
    ]
    for i, (t, b, c) in enumerate(steps):
        row, col = divmod(i, 3)
        add_card(slide, x=0.6 + col * 4.15, y=2.3 + row * 2.35, w=4.0, h=2.15, title=t, body=b, accent=c)


def slide_architecture(prs):
    slide = blank_slide(prs)
    add_pill(slide, "ARCHITECTURE", BRAND_SKY)
    add_heading(slide, "End-to-end data flow")

    def arch_node(x, y, w, h, title, sub, accent):
        card = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(x), Inches(y), Inches(w), Inches(h))
        card.fill.solid()
        card.fill.fore_color.rgb = BG_SLATE_900
        card.line.color.rgb = accent
        card.line.width = Pt(1.75)
        tb = slide.shapes.add_textbox(Inches(x + 0.1), Inches(y + 0.15), Inches(w - 0.2), Inches(h - 0.3))
        tf = tb.text_frame
        tf.word_wrap = True
        p1 = tf.paragraphs[0]
        p1.alignment = PP_ALIGN.CENTER
        p1.text = title
        r1 = p1.runs[0]
        r1.font.name = FONT_HEAD
        r1.font.size = Pt(15)
        r1.font.bold = True
        r1.font.color.rgb = WHITE
        p2 = tf.add_paragraph()
        p2.alignment = PP_ALIGN.CENTER
        p2.text = sub
        r2 = p2.runs[0]
        r2.font.name = FONT_MONO
        r2.font.size = Pt(10)
        r2.font.color.rgb = TEXT_SLATE
        p2.space_before = Pt(2)

    # Column 1: Citizen
    arch_node(0.7, 3.0, 3.5, 2.0, "Citizen", "WhatsApp • Telegram\nSMS • IVR • USSD • Web", BRAND_ORANGE)
    # Column 2: Cloud stack
    arch_node(5.0, 1.9, 3.5, 1.5, "Cloud Run", "Node 22 + Express 5\nFirebase Auth guard", BRAND_TEAL)
    arch_node(5.0, 3.7, 3.5, 1.5, "Gemini AI", "Text · Vision · ASR · TTS\nRetry + backoff", BRAND_EMERALD)
    arch_node(5.0, 5.5, 3.5, 1.5, "Firestore", "15 districts · 8 schemes\n24+ live requests", BRAND_SKY)
    # Column 3: Frontend/policymaker
    arch_node(9.3, 2.8, 3.5, 1.9, "Firebase Hosting", "React 19 + Vite 8\nTailwind v4", BRAND_TEAL)
    arch_node(9.3, 5.0, 3.5, 1.9, "Policymaker", "Sanction · Nudge\nSatellite audit", BRAND_AMBER)

    add_paragraph(slide,
                  "Every citizen ingest → translated → classified → geo-located → PI recomputed → visible to policymaker in real time",
                  y=6.9, x=0.6, width=12.1, size=10, color=TEXT_SLATE, align=PP_ALIGN.CENTER, font=FONT_MONO)


def slide_multichannel(prs):
    slide = blank_slide(prs)
    add_pill(slide, "STAGE 1 · INGESTION", BRAND_EMERALD)
    add_heading(slide, "Meet citizens where they already are.")
    add_paragraph(slide, "Anyone in India can report infrastructure issues without downloading an app.",
                  y=1.9, x=0.6, width=12.1, size=14)

    channels = [
        ("WhatsApp Business API", RGBColor(0x4A, 0xDE, 0x80)),
        ("Telegram Bot", BRAND_SKY),
        ("SMS", BRAND_AMBER),
        ("IVR (missed call)", RGBColor(0xA8, 0x55, 0xF7)),
        ("Web app", BRAND_TEAL),
    ]
    x = 0.9
    for label, color in channels:
        pill = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(x), Inches(2.7), Inches(2.3), Inches(0.5))
        pill.fill.solid()
        pill.fill.fore_color.rgb = BG_SLATE_900
        pill.line.color.rgb = color
        pill.line.width = Pt(1.5)
        tf = pill.text_frame
        tf.margin_top = Pt(2)
        tf.margin_bottom = Pt(2)
        p = tf.paragraphs[0]
        p.alignment = PP_ALIGN.CENTER
        p.text = label
        r = p.runs[0]
        r.font.name = FONT_MONO
        r.font.size = Pt(11)
        r.font.bold = True
        r.font.color.rgb = color
        x += 2.45

    add_card(slide, x=0.6, y=3.8, w=6, h=2.8,
             title="One shared pipeline",
             body="Every channel converges into ingestCitizenRequest(): translate → extract → resolve location → H3 cell → Firestore + priority-index tick. Atomic Firestore transaction.",
             accent=BRAND_TEAL)
    add_card(slide, x=6.75, y=3.8, w=6, h=2.8,
             title="Live location resolution",
             body="India Post PIN lookup → Gemini district extraction → Nominatim geocoder → Wikipedia enrichment. Missing districts auto-provisioned.",
             accent=BRAND_EMERALD)


def slide_ai(prs):
    slide = blank_slide(prs)
    add_pill(slide, "STAGE 2 · AI", BRAND_EMERALD)
    add_heading(slide, "Gemini does the heavy lifting.")
    features = [
        ("Translate", "22+ Indian languages → English, with source detection.", BRAND_TEAL),
        ("ASR", "Voice note in Hindi / Tamil / Kannada → text.", BRAND_EMERALD),
        ("Vision", "Photo of a pothole → deficit type + severity + estimated cost.", BRAND_SKY),
        ("Entity Extract", "Category, district, urgency, affected count — structured JSON.", BRAND_ORANGE),
        ("TTS", "Reply spoken back to citizens who called via IVR.", BRAND_AMBER),
        ("Policy Copilot", "NITI planner asks \"which districts most urgently need clean water?\" — markdown answer.", BRAND_TEAL),
    ]
    for i, (t, b, c) in enumerate(features):
        row, col = divmod(i, 3)
        add_card(slide, x=0.6 + col * 4.15, y=2.2 + row * 2.2, w=4.0, h=2.0, title=t, body=b, accent=c)
    add_paragraph(slide,
                  "gemini-flash-lite-latest (text, ~1000/day) + gemini-3.8-flash (multimodal) with 429/503 retry-with-backoff",
                  y=6.85, x=0.6, width=12.1, size=10, color=TEXT_SLATE, align=PP_ALIGN.CENTER, font=FONT_MONO)


def slide_priority(prs):
    slide = blank_slide(prs)
    add_pill(slide, "STAGE 3 · PRIORITY INDEX", BRAND_ORANGE)
    add_heading(slide, "Transparent, tuneable, defensible.")
    add_card(slide, x=0.6, y=2.4, w=6, h=3.3,
             title="PI = w₁·Demand + w₂·Deficit + w₃·Vulnerability",
             body="Same math on frontend (React) and backend (Node). 50/50 vitest cases guarantee parity — no drift between what the planner sees on the slider and what actually persists to Firestore.",
             accent=BRAND_TEAL)
    add_card(slide, x=6.75, y=2.4, w=6, h=3.3,
             title="Slide-to-simulate, no writes",
             body="POST /api/priority/simulate re-ranks all 15 districts in under 150 ms without touching the DB. Sanction confirms → auto-recompute + save in transaction.",
             accent=BRAND_EMERALD)
    add_paragraph(slide, "Every weight is visible. Every ranking is auditable. No black box.",
                  y=6.2, x=0.6, width=12.1, size=16, color=BRAND_TEAL, bold=True, align=PP_ALIGN.CENTER)


def slide_dashboard(prs):
    slide = blank_slide(prs)
    add_pill(slide, "STAGE 4 · POLICYMAKER LAYER", BRAND_SKY)
    add_heading(slide, "NITI-grade planning surface")
    features = [
        ("Live hex map", "H3 spatial grid over India, colored by PI. Click a district, see all its citizen requests.", BRAND_TEAL),
        ("AI Recommender", "Top-N projects with matched scheme, estimated budget, beneficiary reach. Gemini polishes titles + justifications.", BRAND_EMERALD),
        ("Trade-off simulator", "Set 3 PI weights + sector filter → see instant re-ranking + AI-suggested target sector.", BRAND_ORANGE),
        ("Policy Copilot", "Natural-language Q&A over selected districts. Markdown answers with citations.", BRAND_SKY),
    ]
    for i, (t, b, c) in enumerate(features):
        row, col = divmod(i, 2)
        add_card(slide, x=0.6 + col * 6.15, y=2.3 + row * 2.3, w=6.0, h=2.1, title=t, body=b, accent=c)


def slide_closed_loop(prs):
    slide = blank_slide(prs)
    add_pill(slide, "STAGE 5 · CLOSED LOOP", BRAND_AMBER)
    add_heading(slide, "Every ₹ shows up on someone's phone.")
    add_card(slide, x=0.6, y=2.3, w=6, h=2.6,
             title="Sanction fanout",
             body="Policymaker clicks Sanction Fund → backend finds every citizen request linked to that project's district+category → Telegram/WhatsApp/SMS dispatch fires in parallel.",
             accent=BRAND_EMERALD)
    add_card(slide, x=6.75, y=2.3, w=6, h=2.6,
             title="Ad-hoc Telegram nudges",
             body="Searchable contact directory — every citizen who messaged the bot becomes searchable by name/district/complaint. One click prefills chat_id.",
             accent=BRAND_SKY)
    add_card(slide, x=0.6, y=5.1, w=12.1, h=1.9,
             title="Satellite audit",
             body="Pre/post construction imagery + AI verification score. Loop closes when the citizen sees the road they reported — not just a promise, but proof.",
             accent=BRAND_ORANGE)


def slide_security(prs):
    slide = blank_slide(prs)
    add_pill(slide, "STAGE 6 · TRUST & ACCESS", BRAND_EMERALD)
    add_heading(slide, "Firebase Auth · Role-based · Open API.")
    add_card(slide, x=0.6, y=2.3, w=6, h=2.7,
             title="Two identity types",
             body="Citizen — Google or email/password. Submit requests, view public data.\nPolicymaker — email in POLICYMAKER_EMAILS. Sanction, dispatch nudges, review satellite audits.",
             accent=BRAND_EMERALD)
    add_card(slide, x=6.75, y=2.3, w=6, h=2.7,
             title="Server-verified guards",
             body="Every mutation checks a Firebase ID token via Admin SDK. Frontend UI hides restricted buttons; backend rejects with 403 if bypassed. UI reverts optimistic state on failure.",
             accent=BRAND_SKY)
    add_card(slide, x=0.6, y=5.2, w=12.1, h=1.8,
             title="Open DPG surface — Swagger UI at /api/docs",
             body="Full OpenAPI 3.0.3 spec. 10 tagged groups, 25+ endpoints, live \"Try it out\" with Bearer token auth. Any state can consume this API — that's the DPG promise.",
             accent=BRAND_TEAL)


def slide_numbers(prs):
    slide = blank_slide(prs)
    add_pill(slide, "BY THE NUMBERS", BRAND_TEAL)
    add_heading(slide, "What we shipped in this build.")
    stats = [
        ("6", "Ingestion channels", BRAND_EMERALD),
        ("6", "Gemini AI endpoints", BRAND_SKY),
        ("15", "Districts seeded", BRAND_ORANGE),
        ("8", "Govt schemes indexed", BRAND_TEAL),
        ("50/50", "PI parity tests passing", BRAND_EMERALD),
        ("25+", "API endpoints", BRAND_SKY),
        ("22", "Languages supported", BRAND_ORANGE),
        ("2124", "Frontend modules built", BRAND_AMBER),
    ]
    for i, (n, l, c) in enumerate(stats):
        row, col = divmod(i, 4)
        add_stat(slide, x=0.6 + col * 3.1, y=2.5 + row * 2.1, w=2.95, h=1.9, number=n, label=l, color=c)


def slide_stack(prs):
    slide = blank_slide(prs)
    add_pill(slide, "STACK", BRAND_SKY)
    add_heading(slide, "Modern, minimal, production-ready.")

    rows = [
        ("Frontend", "React 19 · Vite 8 · Tailwind v4 · TypeScript 5", "SPA at Firebase Hosting"),
        ("Backend", "Node 22 · Express 5 · zod · pino", "Container on Cloud Run (Mumbai)"),
        ("Database", "Firestore (Native)", "5 collections, 60+ live docs"),
        ("AI", "Gemini flash-lite + 3.8-flash", "Text, vision, ASR, TTS"),
        ("Auth", "Firebase Auth", "Google + email/password, role-based"),
        ("Messaging", "Telegram Bot API · Twilio", "Multi-channel citizen loop"),
        ("Spatial", "H3 hex grid · Leaflet", "15-district India map"),
        ("Live data", "India Post PIN · OSM · Wikipedia", "Location + district enrichment"),
        ("Docs", "Swagger UI + OpenAPI 3.0.3", "Public DPG API surface"),
        ("CI", "Cloud Build", "Docker layer caching · <60 s redeploy"),
    ]
    top = 2.2
    row_h = 0.42
    col_x = [0.6, 2.5, 7.5]
    col_w = [1.9, 5.0, 5.3]

    # Header
    for i, header in enumerate(["Layer", "Tech", "Role"]):
        tb = slide.shapes.add_textbox(Inches(col_x[i]), Inches(top), Inches(col_w[i]), Inches(row_h))
        tf = tb.text_frame
        tf.margin_top = 0
        tf.margin_bottom = 0
        p = tf.paragraphs[0]
        p.text = header
        r = p.runs[0]
        r.font.name = FONT_HEAD
        r.font.size = Pt(12)
        r.font.bold = True
        r.font.color.rgb = BRAND_TEAL

    # Separator line
    line = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.6), Inches(top + row_h), Inches(12.1), Inches(0.02))
    line.fill.solid()
    line.fill.fore_color.rgb = BORDER_SLATE
    line.line.fill.background()

    for i, (a, b, c) in enumerate(rows):
        y = top + row_h + 0.1 + i * row_h
        for j, txt in enumerate([a, b, c]):
            tb = slide.shapes.add_textbox(Inches(col_x[j]), Inches(y), Inches(col_w[j]), Inches(row_h))
            tf = tb.text_frame
            tf.margin_top = 0
            tf.margin_bottom = 0
            p = tf.paragraphs[0]
            p.text = txt
            r = p.runs[0]
            r.font.name = FONT_BODY
            r.font.size = Pt(11)
            r.font.color.rgb = WHITE if j == 0 else TEXT_SLATE
            r.font.bold = (j == 0)


def slide_deployment(prs):
    slide = blank_slide(prs)
    add_pill(slide, "LIVE", BRAND_EMERALD)
    add_heading(slide, "Public URLs — try them right now.")

    box = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.6), Inches(2.2), Inches(12.1), Inches(2.4))
    box.fill.solid()
    box.fill.fore_color.rgb = BG_SLATE_900
    box.line.color.rgb = BRAND_EMERALD
    box.line.width = Pt(1.5)

    urls = [
        ("App",  "https://jansetu-ai-afa77.web.app"),
        ("API",  "https://jansetu-backend-klv2alsjfa-el.a.run.app"),
        ("Docs", "https://jansetu-backend-klv2alsjfa-el.a.run.app/api/docs/"),
        ("Bot",  "@jansetu_ai_bot  on Telegram"),
    ]
    for i, (label, url) in enumerate(urls):
        tb = slide.shapes.add_textbox(Inches(0.9), Inches(2.4 + i * 0.5), Inches(11.5), Inches(0.45))
        tf = tb.text_frame
        tf.margin_top = 0
        tf.margin_bottom = 0
        p = tf.paragraphs[0]
        r1 = p.add_run()
        r1.text = f"{label:<6}  "
        r1.font.name = FONT_MONO
        r1.font.size = Pt(14)
        r1.font.bold = True
        r1.font.color.rgb = WHITE
        r2 = p.add_run()
        r2.text = url
        r2.font.name = FONT_MONO
        r2.font.size = Pt(14)
        r2.font.color.rgb = BRAND_EMERALD

    add_card(slide, x=0.6, y=4.9, w=6, h=2.2,
             title="Fast redeploy",
             body=".\\scripts\\deploy-all.ps1 — 60 s end-to-end. Cloud Build caches Docker layers, Firebase Hosting only uploads changed files.",
             accent=BRAND_EMERALD)
    add_card(slide, x=6.75, y=4.9, w=6, h=2.2,
             title="Auth-gated",
             body="POST /api/telegram/send without a Bearer token → 401. As a citizen → 403. As a policymaker → message arrives on the citizen's phone.",
             accent=BRAND_SKY)


def slide_demo(prs):
    slide = blank_slide(prs)
    add_pill(slide, "LIVE DEMO", BRAND_ORANGE)
    add_heading(slide, "60-second walkthrough")

    steps = [
        ("Citizen (phone)",     "Message @jansetu_ai_bot → \"Bangalore 560001, no water for 3 days\" → within 1 s, category + district + urgency + case ID reply."),
        ("Policymaker (laptop)", "Sign in at jansetu-ai-afa77.web.app → citizen's request appears live on the hex map."),
        ("Simulate",            "Drag PI sliders → all 15 districts re-rank in real time. AI Recommender surfaces top-3 projects with scheme + budget."),
        ("Sanction",            "Click Sanction Fund → confetti + citizen gets a Telegram DM: 🎉 Your ₹8 Cr JJM project has been sanctioned."),
        ("Audit",               "Verification tab shows pre-construction satellite imagery. Once complete, post imagery + AI score close the loop."),
    ]
    for i, (head, body) in enumerate(steps):
        tb = slide.shapes.add_textbox(Inches(0.6), Inches(2.2 + i * 0.95), Inches(12.1), Inches(0.9))
        tf = tb.text_frame
        tf.margin_top = 0
        tf.margin_bottom = 0
        tf.word_wrap = True
        p = tf.paragraphs[0]
        r1 = p.add_run()
        r1.text = f"{i+1}. {head}: "
        r1.font.name = FONT_HEAD
        r1.font.size = Pt(14)
        r1.font.bold = True
        r1.font.color.rgb = BRAND_TEAL
        r2 = p.add_run()
        r2.text = body
        r2.font.name = FONT_BODY
        r2.font.size = Pt(13)
        r2.font.color.rgb = TEXT_SLATE


def slide_impact(prs):
    slide = blank_slide(prs)
    add_pill(slide, "WHY IT MATTERS", BRAND_TEAL)
    add_heading(slide, "Every rupee traceable back to a citizen.")
    audiences = [
        ("For citizens", "No app to install. Zero literacy barrier — voice notes in any Indian language. Direct feedback when your report becomes policy.", BRAND_EMERALD),
        ("For policymakers", "PFMS money finds its highest-marginal-return sector, not just its most-connected district. Every sanction has a paper trail of citizen demand.", BRAND_SKY),
        ("For the state", "Aspirational Districts, Gati Shakti, PMGSY, JJM — every scheme gets a real-time citizen-demand feed. Trust is measurable via nudge read rates.", BRAND_ORANGE),
        ("What's next", "Bhashini ASR (native Indian voice), Aadhaar-based citizen verification, real ISRO Bhuvan API, PostgreSQL for the analytics warehouse.", BRAND_AMBER),
    ]
    for i, (t, b, c) in enumerate(audiences):
        row, col = divmod(i, 2)
        add_card(slide, x=0.6 + col * 6.15, y=2.3 + row * 2.4, w=6.0, h=2.2, title=t, body=b, accent=c)


def slide_thanks(prs):
    slide = blank_slide(prs)
    add_pill(slide, "THANK YOU", BRAND_EMERALD, y=2.4, x=5.3)
    tb = slide.shapes.add_textbox(Inches(0), Inches(2.9), SLIDE_W, Inches(1.5))
    tf = tb.text_frame
    p = tf.paragraphs[0]
    p.alignment = PP_ALIGN.CENTER
    p.text = "JanSetu AI"
    r = p.runs[0]
    r.font.name = FONT_HEAD
    r.font.size = Pt(80)
    r.font.bold = True
    r.font.color.rgb = BRAND_TEAL

    add_paragraph(slide,
                  "A Digital Public Good for India — built end-to-end in one build session.",
                  y=4.8, x=1, width=11.3, size=18, color=TEXT_SLATE, align=PP_ALIGN.CENTER)
    add_paragraph(slide, "jansetu-ai-afa77.web.app",
                  y=5.9, x=1, width=11.3, size=16, color=BRAND_EMERALD, bold=True, align=PP_ALIGN.CENTER, font=FONT_MONO)
    add_paragraph(slide, "Questions?",
                  y=6.5, x=1, width=11.3, size=12, color=TEXT_SLATE, align=PP_ALIGN.CENTER, font=FONT_MONO)


def main():
    prs = new_presentation()
    slide_title(prs)
    slide_problem(prs)
    slide_solution(prs)
    slide_architecture(prs)
    slide_multichannel(prs)
    slide_ai(prs)
    slide_priority(prs)
    slide_dashboard(prs)
    slide_closed_loop(prs)
    slide_security(prs)
    slide_numbers(prs)
    slide_stack(prs)
    slide_deployment(prs)
    slide_demo(prs)
    slide_impact(prs)
    slide_thanks(prs)

    out = Path(__file__).resolve().parent.parent / "JanSetu_AI_Presentation.pptx"
    prs.save(out)
    print(f"Wrote {out}  ({out.stat().st_size / 1024:.1f} KB, {len(prs.slides)} slides)")


if __name__ == "__main__":
    main()
