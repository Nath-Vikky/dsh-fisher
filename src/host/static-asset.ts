import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gzip} from 'node:zlib';
import {promisify} from 'node:util';
import type {IncomingMessage,ServerResponse} from 'node:http';
import {VERSION} from '../protocol.ts';

const compress=promisify(gzip);
export function acceptsGzip(header:string|undefined):boolean{
  const encodings=(header??'').split(',').map(part=>{const [name,...params]=part.trim().toLowerCase().split(';');const q=params.find(value=>value.trim().startsWith('q='));return {name,quality:q?Number(q.trim().slice(2)):1};});
  return ((encodings.find(item=>item.name==='gzip')??encodings.find(item=>item.name==='*'))?.quality??0)>0;
}

export class StaticAsset {
  private loaded:Promise<{body:Buffer;etag:string}>|undefined;private encoded:Promise<Buffer>|undefined;
  private file:URL;private contentType:string;private script:boolean;
  constructor(file:URL,contentType:string,script=false){this.file=file;this.contentType=contentType;this.script=script;}
  async send(request:IncomingMessage,response:ServerResponse,disposed:()=>boolean):Promise<void>{
    this.loaded??=readFile(this.file).then(body=>({body,etag:`W/"${createHash('sha256').update(body).digest('hex')}"`})).catch(error=>{this.loaded=undefined;throw error;});
    const {body,etag}=await this.loaded;
    const version=new URL(request.url??'/','http://localhost').searchParams.get('v');
    const headers:Record<string,string>={'Content-Type':this.contentType,'X-Content-Type-Options':'nosniff','ETag':etag,
      'Cache-Control':this.script?(version===VERSION?'private, max-age=604800, immutable':'no-cache'):'private, max-age=604800, immutable'};
    if(this.script)headers.Vary='Accept-Encoding';
    if(request.headers['if-none-match']?.split(',').some(value=>value.trim()==='*'||value.trim().replace(/^W\//,'')===etag.replace(/^W\//,''))){
      if(disposed()||response.destroyed)return;response.writeHead(304,headers);response.end();return;
    }
    let payload=body;
    if(this.script&&acceptsGzip(request.headers['accept-encoding'])){
      this.encoded??=compress(body).catch(error=>{this.encoded=undefined;throw error;});payload=await this.encoded;headers['Content-Encoding']='gzip';
    }
    if(disposed()||response.destroyed)return;
    headers['Content-Length']=String(payload.length);response.writeHead(200,headers);response.end(payload);
  }
}
