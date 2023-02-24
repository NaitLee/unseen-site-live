#!/bin/sh
for i in $@; do {
    n="${i%.html}"
    n="${n%.htm}"
    n="${n%.xml}"
    n="${n%.svg}"
    { tr -d '\n' < "$i"; echo; } | sed -E 's/>/>\n/g' | sed -E -f xml-to-dash.sed >"$n--"
}; done
