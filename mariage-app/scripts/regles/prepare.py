# Copie de firestore.rules où les adresses du couple sont remplacées par des adresses de test (p1@test.fr = partenaire 2,
# dans l'ordre où elles apparaissent), pour tester les règles sans écrire de vraie adresse dans un script.
import re, pathlib
src = pathlib.Path(__file__).resolve().parents[2] / "firestore.rules"
seen = []
def rep(m):
    if m.group(1) not in seen: seen.append(m.group(1))
    return "'p%d@test.fr'" % (seen.index(m.group(1)) + 1)
pathlib.Path(__file__).with_name("test.rules").write_text(re.sub(r"'([^'@\s]+@[^'\s]+)'", rep, src.read_text()))
print(f"{len(seen)} adresses remplacées")
