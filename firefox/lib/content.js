/*
  content.js

  - injected FolderView Services into each page
  
*/
function imgList(){
  let list = document.querySelectorAll('img'),
      id = 1,
      result = []

  list.forEach( function(img){
       if(img.naturalHeight > 96
     || img.naturalWidth > 96) {

      let link = '',
          a = img.closest('a')
      if(a != null) link = a.href
      
      console.log(id, a )
      result.push({ 
        id:id++,
        title:(img.alt ?img.alt :''),
        src:(img.src.indexOf('data:') < 0 ?img.src :img.currentSrc),
        h:img.naturalHeight,
        w:img.naturalWidth,
        link:link
      })
    }
  })

  result = JSON.stringify(result)
  // console.log('imgList result', result)
  return result
}

//init,  not called:
// window.addEventListener('DOMContentLoaded', (event) => {
var imglist = imgList()

browser.runtime.onMessage.addListener(function(m) {
  if(m.greeting==='imgList'){
    let data = imgList()
    console.log('browser.runtime.imgList', JSON.parse(data))
    browser.runtime.sendMessage({
      sender:'content',
      to: 'background',
      type: 'imgList',
      data:data
    });
  } 
  else
    console.log("Content script received message: ", m.greeting);
});

window.addEventListener('beforeunload ', (event) => {
  console.log('content.js beforeunload')
  // myPort.postMessage({greeting: "beforeunload"})
  browser.runtime.sendMessage({
    sender:'content',
    to: 'background',
    type: 'bbl',
    data:'content.js beforeunload'
  });
})

console.log(`content js init`)

