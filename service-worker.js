const CACHE_NAME = "mamis-learning-hub-v1";

const APP_SHELL = [
  "./",
  "./index.html",
  "./siswa.html",
  "./admin.html",
  "./offline.html",
  "./manifest.json",
  "./logo-mam-is.png",
  "./icon-192.png",
  "./icon-512.png"
];

// Install
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

// Activate
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch
self.addEventListener("fetch", event => {

  const request = event.request;

  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Selalu ambil data terbaru dari Apps Script
  if (
      url.hostname.includes("script.google.com") ||
      url.hostname.includes("script.googleusercontent.com")
  ) {

      event.respondWith(
          fetch(request).catch(() =>
              new Response(
                  JSON.stringify({
                      status:false,
                      message:"Offline"
                  }),
                  {
                      headers:{
                          "Content-Type":"application/json"
                      }
                  }
              )
          )
      );

      return;
  }

  // Halaman HTML
  if(request.mode === "navigate"){

      event.respondWith(

          fetch(request)
              .then(response=>{

                  const copy=response.clone();

                  caches.open(CACHE_NAME)
                      .then(cache=>cache.put(request,copy));

                  return response;

              })
              .catch(async ()=>{

                  const cache=await caches.match(request);

                  return cache || caches.match("./offline.html");

              })

      );

      return;

  }

  // Asset statis
  event.respondWith(

      caches.match(request)

      .then(cache=>{

          if(cache){

              return cache;

          }

          return fetch(request)

              .then(response=>{

                  if(
                      !response ||
                      response.status!==200 ||
                      response.type==="opaque"
                  ){

                      return response;

                  }

                  const copy=response.clone();

                  caches.open(CACHE_NAME)
                      .then(cache=>cache.put(request,copy));

                  return response;

              });

      })

  );

});

// Update aplikasi
self.addEventListener("message", event => {

    if(event.data==="SKIP_WAITING"){

        self.skipWaiting();

    }

});
