#!/bin/bash
# Graham Value — one-time Mac setup and first publish to GitHub Pages.
# Run from this folder in Terminal:   bash setup-mac.sh
# It will ask for your Mac password (for Homebrew) and open a browser once to log in to GitHub.
set -e
cd "$(dirname "$0")"
REPO_NAME="${1:-graham-value}"

say() { printf "\n\033[1;34m==> %s\033[0m\n" "$1"; }

# 1. Apple's command line tools (gives you git)
if ! xcode-select -p >/dev/null 2>&1; then
  say "Installing Apple command line tools. A window will pop up: click Install, wait, then run this script again."
  xcode-select --install || true
  exit 0
fi

# 2. Homebrew (Mac package manager)
if ! command -v brew >/dev/null 2>&1; then
  say "Installing Homebrew (asks for your Mac password)"
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  eval "$(/opt/homebrew/bin/brew shellenv)"
  grep -q 'brew shellenv' ~/.zprofile 2>/dev/null || echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
fi

# 3. git, GitHub CLI and VS Code (code editor)
say "Installing git, GitHub CLI and Visual Studio Code"
brew install git gh
brew list --cask visual-studio-code >/dev/null 2>&1 || brew install --cask visual-studio-code

# 4. Log in to GitHub (opens your browser; create a free account there if you don't have one)
if ! gh auth status >/dev/null 2>&1; then
  say "Logging in to GitHub. Choose: GitHub.com > HTTPS > Login with a web browser"
  gh auth login --hostname github.com --git-protocol https --web
fi
GH_USER="$(gh api user --jq .login)"

# 5. Commit the project
if [ ! -d .git ]; then git init -b main; fi
git config user.name >/dev/null || git config user.name "$GH_USER"
git config user.email >/dev/null || git config user.email "$GH_USER@users.noreply.github.com"
git add -A
git commit -m "Graham Value app" >/dev/null 2>&1 || true

# 6. Create the GitHub repository and upload
if ! git remote get-url origin >/dev/null 2>&1; then
  say "Creating github.com/$GH_USER/$REPO_NAME"
  gh repo create "$REPO_NAME" --public --source=. --remote=origin --push
else
  git push -u origin main
fi

# 7. Turn on GitHub Pages (free hosting)
say "Turning on GitHub Pages"
gh api -X POST "repos/$GH_USER/$REPO_NAME/pages" -f "source[branch]=main" -f "source[path]=/" >/dev/null 2>&1 || true

URL="https://$GH_USER.github.io/$REPO_NAME/"
say "Done. Your app will be live in 1-2 minutes at:"
echo "   $URL"
echo
echo "On your iPhone: open that link in Safari > tap Share > Add to Home Screen > Add."
