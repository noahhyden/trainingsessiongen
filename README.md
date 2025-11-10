# Träningspassgenerator

En ren och robust version av träningspassgeneratorn för att generera träningspass baserat på gren och åldersgrupp.

## Funktioner

- Välj gren och åldersgrupp
- Generera slumpmässiga träningspass med 4 block
- Exportera flera träningspass till Excel
- Korrekt Fisher-Yates shuffle-algoritm
- Felhantering och validering
- Responsiv design med Tailwind CSS

## Installation

```bash
npm install
```

## Utveckling

```bash
npm run dev
```

## Bygga för produktion

```bash
npm run build
```

## Förhandsvisning

```bash
npm run preview
```

## Förbättringar från originalet

- ✅ Korrekt Fisher-Yates shuffle istället för biased sort
- ✅ Proper error handling med användarvänliga meddelanden
- ✅ Validering av formulärdata
- ✅ Korrekt hantering av data (övningar är strängar, inte objekt)
- ✅ Borttagna oanvända imports och kod
- ✅ Konstantdefinitioner för magic numbers
- ✅ Korrekt HTML-struktur
- ✅ Förbättrad styling och tillgänglighet
- ✅ TypeScript-ready struktur

