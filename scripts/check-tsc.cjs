require('child_process').execSync('node node_modules/typescript/bin/tsc --noEmit',{stdio:'inherit',maxBuffer:50*1024*1024});
