# Bachelor Thesis Report

This is a LaTeX scaffold for the bachelor project report.

## Build

From this folder, run:

```sh
pdflatex main.tex
bibtex main
pdflatex main.tex
pdflatex main.tex
```

Or, if `latexmk` is installed:

```sh
latexmk -pdf main.tex
```

## VS Code Setup

When you open this folder in VS Code, it should recommend these extensions:

- LaTeX Workshop
- Code Spell Checker
- British English dictionary
- LTeX grammar/style checker

Install the recommended extensions when VS Code prompts you. LaTeX Workshop is the important one for building and previewing the PDF.

This workspace is configured to use `main.tex` as the root file and build into the `build/` folder. Auto-build runs when you save a `.tex` file.

You still need a LaTeX compiler installed on your Mac. Good options are:

- MacTeX: full LaTeX installation, easiest but large.
- BasicTeX: smaller installation, may require installing missing packages later.
- Tectonic: modern lightweight compiler, usually simple for projects like this.

After installing a compiler, restart VS Code and run:

```sh
latexmk -pdf main.tex
```

or build from VS Code with:

```text
Cmd+Shift+P -> LaTeX Workshop: Build LaTeX project
```

## Structure

- `main.tex`: report entry point and package configuration
- `chapters/`: one file per main chapter
- `appendices/`: appendix material
- `figures/`: images and diagrams
- `tables/`: optional table files
- `references.bib`: bibliography entries

Start writing in the files under `chapters/`.
