set shell := ["bash", "-uc"]

default:
    @just --list

format:
    npx prettier --write .
    just --unstable --fmt

run:
    npm start
