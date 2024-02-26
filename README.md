## Installing the dependencies - 
```
npm install
```

## Scrapping new data -
For this, firstly provide the link from where data needs to be scrapped. For this, add new link at './app/api/chat/engine/extract.mjs'
```
node --experimental-modules ./app/api/chat/engine/extract.mjs
```

## Generating index -
```
npm run generate
```

## Running the development server -
```
npm run dev
```
