export const windowUtils = {
  location: ()=>{
    if(typeof window !== 'undefined'){
      return window.location.origin
    }
    return ''
  },
  document: ()=>{
    if(typeof window !== 'undefined'){
      return window.document
    }
    return
  }
}