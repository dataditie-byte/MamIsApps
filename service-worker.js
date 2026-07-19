const CACHE_NAME="mamis-learning-hub-v9";
const ASSETS=["./offline.html","./manifest.json","./logo-mam-is.png","./icon-192.png","./icon-512.png"];

self.addEventListener("install",function(event){
  event.waitUntil(
    caches.open(CACHE_NAME).then(async function(cache){
      for(const url of ASSETS){
        try{await cache.add(new Request(url,{cache:"reload"}));}catch(e){}
      }
    }).then(function(){return self.skipWaiting();})
  );
});

self.addEventListener("activate",function(event){
  event.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.filter(function(k){return k!==CACHE_NAME;}).map(function(k){return caches.delete(k);}));
    }).then(function(){return self.clients.claim();})
  );
});

self.addEventListener("fetch",function(event){
  const req=event.request;
  if(req.method!=="GET") return;
  const url=new URL(req.url);

  if(url.hostname.indexOf("script.google.com")!==-1 || url.hostname.indexOf("script.googleusercontent.com")!==-1){
    return;
  }

  if(req.mode==="navigate" || /\.(?:html?)$/i.test(url.pathname)){
    event.respondWith(
      fetch(new Request(req,{cache:"no-store"}))
        .catch(function(){return caches.match("./offline.html");})
    );
    return;
  }

  event.respondWith(
    fetch(req).then(function(res){
      if(res && res.ok && url.origin===self.location.origin){
        const copy=res.clone();
        caches.open(CACHE_NAME).then(function(cache){cache.put(req,copy);});
      }
      return res;
    }).catch(function(){return caches.match(req);})
  );
});
