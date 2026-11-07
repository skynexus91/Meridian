import ts from 'typescript';
import {readFile} from 'node:fs/promises';
const strings=new Set<string>();
for(const path of ['src/App.tsx','src/Admin.tsx','src/Warnings.tsx','src/MapView.tsx']){const input=await readFile(path,'utf8');const file=ts.createSourceFile(path,input,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);function visit(node:ts.Node){if(ts.isJsxText(node)){const text=node.getText(file).replace(/\s+/g,' ').trim();if(/[a-zA-Z]/.test(text))strings.add(text);}if(ts.isJsxAttribute(node)&&['aria-label','placeholder','title','alt'].includes(node.name.getText(file))&&node.initializer&&ts.isStringLiteral(node.initializer))strings.add(node.initializer.text);ts.forEachChild(node,visit);}visit(file);}console.log([...strings].sort().join('\n'));
