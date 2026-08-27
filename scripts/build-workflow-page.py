#!/usr/bin/env python3
"""Generate public/how_it_works/workflow/index.html.

The page is a single self-contained file, fonts and all, like the other three
under /how_it_works/. It borrows the Staff Guide's palette and @font-face
blocks deliberately: the audience is the space manager, not a developer, so it
should look like the guide rather than the dark schematic next door.

Run from the repo root:  python3 scripts/build-workflow-page.py
"""
import io, os

# The guide is the source of the shared look: pull its <style> opening, both
# base64 @font-face blocks and the :root palette straight out of the built
# file, so the two pages can never drift apart.
_guide = io.open("public/how_it_works/guide/index.html", encoding="utf-8").read()
preamble = _guide[_guide.find("<style>"):_guide.find(".wrap {")]

CSS = """
  * { box-sizing: border-box; }
  html { overflow-x: clip; }
  body { overflow-x: clip; }
  body {
    margin: 0; background: var(--bg); color: var(--ink);
    font-family: var(--font-body); font-size: 17px; line-height: 1.6;
    -webkit-font-smoothing: antialiased;
  }
  a { color: inherit; }
  .wrap { max-width: 1180px; margin: 0 auto; padding: 48px 24px 100px; }

  .eyebrow {
    font-size: 11.5px; font-weight: 700; letter-spacing: .16em; text-transform: uppercase;
    color: var(--calm); margin: 0 0 12px;
  }
  h1 {
    font-family: var(--font-display); font-weight: 700; font-size: 40px; line-height: 1.08;
    letter-spacing: -0.015em; margin: 0 0 14px; text-wrap: balance;
  }
  .lede { font-size: 18.5px; color: var(--ink-soft); margin: 0 0 6px; max-width: 62ch; }

  h2 {
    font-family: var(--font-display); font-weight: 700; font-size: 25px;
    margin: 56px 0 6px; letter-spacing: -0.01em;
  }
  .h2sub { color: var(--ink-faint); font-size: 15px; margin: 0 0 22px; max-width: 66ch; }

  /* ---- The swimlane grid ----
     Deliberately a CSS grid and not drawn wires. The system map next door
     positions every arrow and label by hand, and a layout change means
     re-tuning all of them. Here the arrows are just cells, so the thing can
     be edited without anything colliding. */
  .flow {
    display: grid;
    grid-template-columns: 132px repeat(4, minmax(0, 1fr));
    gap: 10px;
    align-items: stretch;
  }
  .flow__corner { }
  .stagehead {
    padding: 0 2px 6px;
    border-bottom: 2px solid var(--rule);
  }
  .stagehead__n {
    display: inline-flex; align-items: center; justify-content: center;
    width: 21px; height: 21px; border-radius: 50%;
    background: var(--ink); color: var(--bg);
    font-size: 12px; font-weight: 700; margin-right: 7px;
  }
  .stagehead__t { font-weight: 700; font-size: 14.5px; }
  .lanehead {
    /* Column, not row: the <small> is a sibling of the text node, so a row
       flex container puts the role caption alongside the name instead of
       under it ("YOULaura"). */
    display: flex; flex-direction: column; align-items: flex-start; justify-content: center;
    font-size: 12.5px; font-weight: 700; line-height: 1.25;
    color: var(--ink-faint);
    text-transform: uppercase; letter-spacing: .07em;
    padding-right: 10px;
    border-right: 2px solid var(--rule-soft);
  }
  .lanehead small { display: block; text-transform: none; letter-spacing: 0; font-weight: 500; font-size: 12px; margin-top: 3px; }

  .cell { display: flex; flex-direction: column; gap: 8px; min-width: 0; }
  .card {
    background: var(--card); border: 1px solid var(--rule);
    border-radius: 11px; padding: 12px 13px;
    font-size: 13.5px; line-height: 1.5; color: var(--ink-soft);
    flex: 1 1 auto;
  }
  .card b { color: var(--ink); font-weight: 650; }
  .card--auto { background: var(--bg-sunk); border-style: dashed; }
  .card--you { border-color: var(--calm); border-width: 1.5px; }
  .card--ok { border-left: 4px solid var(--approve); }
  .card--no { border-left: 4px solid var(--decline); }
  .card--empty { background: transparent; border: none; }
  .card__tag {
    display: block; font-size: 10.5px; font-weight: 700; letter-spacing: .1em;
    text-transform: uppercase; margin-bottom: 5px;
  }
  .card--ok .card__tag { color: var(--approve); }
  .card--no .card__tag { color: var(--decline); }

  .lane { display: contents; }

  .key { display: flex; flex-wrap: wrap; gap: 20px; margin: 20px 0 0; padding-top: 16px; border-top: 1px solid var(--rule-soft); }
  .keyitem { display: flex; align-items: center; gap: 8px; font-size: 12.5px; color: var(--ink-faint); }
  .keybox { width: 22px; height: 14px; border-radius: 4px; border: 1px solid var(--rule); background: var(--card); flex: none; }
  .keybox--auto { background: var(--bg-sunk); border-style: dashed; }
  .keybox--you { border-color: var(--calm); border-width: 1.5px; }

  /* ---- The two things that are not the happy path ---- */
  .pair { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin-top: 22px; }
  .panel {
    background: var(--card); border: 1px solid var(--rule); border-radius: 14px; padding: 20px 22px;
  }
  .panel h3 { font-family: var(--font-display); font-size: 19px; margin: 0 0 8px; font-weight: 700; }
  .panel p { margin: 0 0 10px; font-size: 14.5px; color: var(--ink-soft); }
  .panel p:last-child { margin-bottom: 0; }

  .strip { margin-top: 22px; }
  .strip__row { display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 10px; }

  .foot {
    margin-top: 64px; padding-top: 18px; border-top: 1px solid var(--rule-soft);
    display: flex; justify-content: space-between; flex-wrap: wrap; gap: 10px;
    font-size: 12.5px; color: var(--ink-faint);
  }
  .crossnav { display: flex; gap: 10px; flex-wrap: wrap; margin: 30px 0 0; }
  .crossnav a {
    font-size: 13px; font-weight: 600; text-decoration: none; color: var(--ink-soft);
    border: 1px solid var(--rule); border-radius: 999px; padding: 7px 14px;
  }
  .crossnav a:hover { border-color: var(--ink-faint); color: var(--ink); }

  .cell__stage { display: none; }

  @media (max-width: 900px) {
    /* One column, so the grid's DOM order takes over: every stage header
       would pile up at the top, stranded from the cards they belong to.
       Drop that row entirely and let each card say which stage it is. */
    .flow { grid-template-columns: 1fr; gap: 0; }
    .stagehead { display: none; }
    .cell__stage {
      display: block;
      font-size: 11px; font-weight: 700; letter-spacing: .09em; text-transform: uppercase;
      color: var(--calm); margin: 0 0 5px;
    }
    .lanehead {
      border-right: none; border-left: 3px solid var(--calm);
      padding: 2px 0 2px 10px; margin: 26px 0 10px; font-size: 13.5px;
    }
    .flow__corner { display: none; }
    .cell { margin-bottom: 8px; }
    .pair, .strip__row { grid-template-columns: 1fr; }
  }
"""

def card(text, cls="", tag=""):
    t = '<span class="card__tag">%s</span>' % tag if tag else ""
    return '<div class="card %s">%s%s</div>' % (cls, t, text)

STAGES = [
    ("1", "Somebody asks"),
    ("2", "Everyone is told"),
    ("3", "You decide"),
    ("4", "What follows"),
]

# lane label, then one cell per stage
LANES = [
    ("The person<br>asking<small>a neighbour, a group, anyone</small>", [
        card("Fills in <b>Request a Date</b> on the website: what they are doing, when, how many people, and what they need."),
        card("Gets an email straight away saying we have their request and <b>it is not confirmed yet</b>. Nobody is left wondering."),
        card("", "card--empty"),
        card("Approved: gets the date and time confirmed.", "card--ok", "if you approved") +
        card("Declined: gets a short, polite note. Nothing is booked.", "card--no", "if you declined"),
    ]),
    ("You<small>Laura</small>", [
        card("", "card--empty"),
        card("Get an email with the whole request and two buttons. If it clashes with something already booked, the subject line says <b>TIME CONFLICT</b> before you even open it.", "card--you"),
        card("Click <b>Approve</b> or <b>Decline</b>. A page opens showing every detail again, and the calendar line at the top. Add a note if you want to. Click <b>Confirm</b>.", "card--you"),
        card("Get a receipt confirming it went through. <b>That email is the proof</b>, whatever the page looked like.", "card--you"),
    ]),
    ("On its own<small>nobody does this</small>", [
        card("Ignores junk, saves the request, and checks it against the calendar <i>and</i> anything still waiting for a decision.", "card--auto"),
        card("Files it as <b>Pending</b> and waits. Nothing expires.", "card--auto"),
        card("Checks for a clash one more time, in case something was booked since the email went out.", "card--auto"),
        card("Puts the event on the public calendar and rebuilds the website, which catches up within a couple of minutes.", "card--auto card--ok", "if you approved") +
        card("Marks the row declined. The calendar is untouched.", "card--auto card--no", "if you declined"),
    ]),
]

rows = []
rows.append('<div class="flow__corner"></div>')
for n, t in STAGES:
    rows.append('<div class="stagehead"><span class="stagehead__n">%s</span><span class="stagehead__t">%s</span></div>' % (n, t))
for label, cells in LANES:
    rows.append('<div class="lanehead">%s</div>' % label)
    for idx, c in enumerate(cells):
        # An empty cell needs no stage label; a real one carries it for the
        # phone layout, where the stage header row is no longer above it.
        tag = ""
        if 'card--empty' not in c:
            n, t = STAGES[idx]
            tag = '<p class="cell__stage">%s &middot; %s</p>' % (n, t)
        rows.append('<div class="cell">%s%s</div>' % (tag, c))

FLOW = "\n        ".join(rows)

BODY = """
<div class="wrap">

  <p class="eyebrow">Staff Guide &middot; Workflow</p>
  <h1>What happens when somebody asks to use the space</h1>
  <p class="lede">
    From the moment a request is submitted to the moment it is on the calendar. Three clicks of it
    are yours; the rest happens whether you are looking or not.
  </p>
  <p class="lede">
    Nothing here is about how the website is built. If you want that, the
    <a href="/how_it_works/">technical reference</a> and the
    <a href="/how_it_works/diagram/">system map</a> are next door.
  </p>

  <div class="flow">
        __FLOW__
  </div>

  <div class="key">
    <span class="keyitem"><i class="keybox keybox--you"></i>You do this</span>
    <span class="keyitem"><i class="keybox"></i>The person asking sees this</span>
    <span class="keyitem"><i class="keybox keybox--auto"></i>Happens on its own</span>
  </div>

  <h2>The two things that are not the straight line</h2>
  <p class="h2sub">
    Almost every request goes the way above. These are the other two, and neither is a problem.
  </p>

  <div class="pair">
    <div class="panel">
      <h3>If you do nothing</h3>
      <p>
        The request sits as <b>Pending</b>. It does not expire, nothing is lost, and the person who
        asked is not told anything new. Their last message from us still says it is not confirmed.
      </p>
      <p>
        A daily summary listing everything still waiting goes to
        <b>3rdspacesyv@gmail.com</b>. That reminder does not come to you, so if one slips you will
        be asked about it rather than reminded by it.
      </p>
    </div>
    <div class="panel">
      <h3>If plans change afterwards</h3>
      <p>
        Every approval email has a <b>cancel link</b> in it. One click takes the event off the
        calendar, marks the row cancelled, and emails the person to say so. All three, together, so
        they can never disagree.
      </p>
      <p>
        For a change of time rather than a cancellation, edit the event in Google Calendar and email
        the person yourself. The website catches up on its own.
      </p>
    </div>
  </div>

  <h2>The mailing list is a separate thing</h2>
  <p class="h2sub">
    It shares the same spreadsheet but has nothing to do with space requests.
  </p>

  <div class="strip">
    <div class="strip__row">
      __STRIP__
    </div>
  </div>

  <div class="crossnav">
    <a href="/how_it_works/guide/">&larr; Back to the staff guide</a>
    <a href="/how_it_works/">Technical reference</a>
    <a href="/how_it_works/diagram/">System map</a>
  </div>

  <footer class="foot">
    <span>3RD SPACE. Written for the people running the space, not for developers.</span>
    <span>Updated Aug 2026</span>
  </footer>

</div>
"""

STRIP = "\n      ".join([
    card("Somebody enters their email on the website, on the home page or the full join form.", "card--auto"),
    card("It is saved to the <b>Contact List</b> tab and marked <b>Subscribed</b>.", "card--auto"),
    card("Overnight, everyone still subscribed is copied into a Google Contacts group called <b>3RD SPACE Mailing List</b>.", "card--auto"),
    card("You write one email and put that group name in <b>Bcc</b>. Never in To.", "card--you"),
])

GATE = """
<div class="pw-gate" id="pw-gate">
  <form class="pw-gate__card" id="pw-form">
    <p class="pw-gate__eyebrow">3RD SPACE</p>
    <h1 class="pw-gate__title">This page is private</h1>
    <p class="pw-gate__sub">Enter the password to continue.</p>
    <input type="password" id="pw-input" class="pw-gate__input" placeholder="Password" autocomplete="off" />
    <button type="submit" class="pw-gate__button">Enter</button>
    <p class="pw-gate__error" id="pw-error">That password didn't work. Please try again.</p>
  </form>
</div>
"""

SCRIPT = """
<script>
(function () {
  var KEY = '3rdspace-how-it-works-auth';
  var PASSWORD = 'lx1234';
  var gate = document.getElementById('pw-gate');
  var content = document.getElementById('gated-content');
  function unlock() { gate.style.display = 'none'; content.style.display = ''; }
  try { if (sessionStorage.getItem(KEY) === '1') { unlock(); } } catch (e) {}
  document.getElementById('pw-form').addEventListener('submit', function (e) {
    e.preventDefault();
    if (document.getElementById('pw-input').value === PASSWORD) {
      try { sessionStorage.setItem(KEY, '1'); } catch (e) {}
      unlock();
    } else {
      document.getElementById('pw-error').classList.add('is-visible');
    }
  });
})();
</script>
"""

# Pull the password-gate styles out of the guide so the gate looks identical.
guide = io.open("public/how_it_works/guide/index.html", encoding="utf-8").read()
gs = guide[guide.find(".pw-gate {"):guide.find("</style>")]
gate_css = gs[:gs.rfind(".pw-gate__error")] + gs[gs.rfind(".pw-gate__error"):].split("}", 2)[0] + "}"
# simpler: grab every .pw-gate rule
import re
gate_rules = "\n".join(m.group(0) for m in re.finditer(r"\.pw-gate[^{]*\{[^}]*\}", guide))

html = (
  "<!doctype html>\n<html lang=\"en\">\n<head>\n"
  "<meta charset=\"utf-8\" />\n"
  "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />\n"
  "<title>3RD SPACE &middot; What happens when somebody asks to use the space</title>\n"
  "<meta name=\"description\" content=\"The request workflow at 3RD SPACE, start to finish.\" />\n"
  "<meta name=\"robots\" content=\"noindex, nofollow\" />\n"
  "<link rel=\"icon\" href=\"/favicon-32.png\" sizes=\"32x32\" type=\"image/png\" />\n"
  + preamble + CSS + "\n" + gate_rules + "\n</style>\n</head>\n<body>\n"
  + GATE
  + '<div id="gated-content" style="display:none">\n'
  + BODY.replace("__FLOW__", FLOW).replace("__STRIP__", STRIP)
  + "\n</div>\n" + SCRIPT + "\n</body>\n</html>\n"
)
out = "public/how_it_works/workflow/index.html"
io.open(out, "w", encoding="utf-8").write(html)
print("wrote", out, len(html), "bytes")
assert "—" not in html, "em dash found"
import re as _re
_left = _re.findall(r"__[A-Z][A-Z_]*__", html)
assert not _left, "unreplaced token: %r" % _left
print("no em dashes, no unreplaced tokens")
