# Remote Lab

A TizenBrew app module for Samsung TVs. It shows the keyCode every remote button sends and demonstrates D-pad focus handling, the two things worth knowing before building anything else for the TV.

## Try it on your PC first

Open `app/index.html` in any browser. Arrow keys move, Enter selects, and Escape stands in for the remote's Back button. Most changes can be tested this way without touching the TV.

## Put it on the TV

TizenBrew loads modules through jsDelivr, which serves GitHub repos directly, so there's no npm publish step.

1. Push this folder to a **public** GitHub repo, for example with the GitHub CLI:

   ```
   git init
   git add .
   git commit -m "Remote Lab"
   gh repo create tizenbrew-remote-lab --public --source . --push
   ```

2. On the TV, open TizenBrew → Module Manager → **Add GitHub module**.
3. Type `kynomatix/tizenbrew-remote-lab`, then move focus off the field. TizenBrew adds the module when the field loses focus.
4. Launch **Remote Lab** from the module list.

## Seeing changes on the TV

jsDelivr caches what it serves, and that shapes the loop:

| What you add in TizenBrew | What jsDelivr serves | Cached for |
|---|---|---|
| `user/repo`, repo has no tags | the default branch | up to 12 hours |
| `user/repo`, repo has any tag | the latest tag | up to 7 days |
| `user/repo@<commit or version>` | exactly that | long-term, but each new pin is a new URL, so it's fresh the first time |

A plain push can therefore take hours to reach the TV. To check a change straight away, add the module again pinned to the commit: `kynomatix/tizenbrew-remote-lab@<short sha>`.

Avoid creating tags while you're iterating. Once one exists, the unpinned name resolves to it, and that alias caches for a week.

## How the module is described

TizenBrew reads these fields from `package.json`:

- `packageType: "app"`: a standalone page, served on the TV from TizenBrew's local server
- `appName`: the name shown in the module list
- `appPath`: the page to open, relative to the repo root
- `keys`: extra remote keys to register, such as the colour, media, number and channel keys. Arrows, OK and Back arrive without registering.
