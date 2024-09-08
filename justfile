set shell := ["bash", "-uc"]

default:
    @just --list

format:
    npx prettier --write .
    just --unstable --fmt

run:
    npm start

clean:
    rm -rf storage

count-links:
    cp links.sqlite /tmp/links_tmp.sqlite && sqlite3 /tmp/links_tmp.sqlite "SELECT COUNT(*) FROM links;" && rm /tmp/links_tmp.sqlite

show-links:
    cp links.sqlite /tmp/links_tmp.sqlite && sqlite3 -header -column /tmp/links_tmp.sqlite "SELECT DISTINCT url, title, MIN(created_at) as first_seen FROM links GROUP BY url ORDER BY first_seen;" && rm /tmp/links_tmp.sqlite

show-image-links:
    cp links.sqlite /tmp/links_tmp.sqlite && sqlite3 -header -column /tmp/links_tmp.sqlite "SELECT DISTINCT url, title, MIN(created_at) as first_seen FROM links WHERE url LIKE '%.jpg' OR url LIKE '%.jpeg' OR url LIKE '%.gif' OR url LIKE '%.png' GROUP BY url ORDER BY first_seen;" && rm /tmp/links_tmp.sqlite
