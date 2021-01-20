#!/bin/bash

set -euo pipefail

init_project() {
  local projectname="$(get_project_name)"
  set_project_dot_name "$projectname"
  set_package_json_name "$projectname"
  local clonedir="$(basename $PWD)"
  mv ../$clonedir ../$projectname

  read -p "Will this project be deployed to JupiterOne infrastructure?" -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Preserving deploy directory"
  else
    rm -f Jenkinsfile
    rm -r deploy
  fi
  yarn install
  rm -rf .git
  git init
}

get_project_name() {
  read -p "Project name: "
  echo "$REPLY" | filter_name
}

filter_name() {
  tr 'A-Z' 'a-z' | tr ' ' '-'
}

set_project_dot_name() {
  echo "$1" > project.name
}

set_package_json_name() {
  local name="$1"
  sed -i '' -e "s/\"name\": .*$/\"name\": \"$name\",/" package.json
}

init_project
