Deno.serve(async (req) => {
  try {
    const { encryptedFileData, password } = await req.json();
    
    if (!encryptedFileData || !password) {
      return Response.json({ error: 'Missing encrypted file data or password' }, { status: 400 });
    }

    const fileData = new Uint8Array(atob(encryptedFileData).split('').map(c => c.charCodeAt(0)));

    const salt = fileData.slice(0, 16);
    const iv = fileData.slice(16, 28);
    const encryptedData = fileData.slice(28);

    const passwordKey = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveBits', 'deriveKey']
    );

    const key = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      passwordKey,
      { name: 'AES-GCM', length: 256 },
      true, // extractable
      ['decrypt']
    );

    const decryptedData = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      key,
      encryptedData
    );

    // To send binary data back as JSON, convert to base64
    let binary = '';
    const bytes = new Uint8Array(decryptedData);
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    const base64DecryptedData = btoa(binary);

    return Response.json({ decryptedData: base64DecryptedData }, {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error decrypting file:', error);
    return Response.json({ 
      error: 'Decryption failed', 
      details: 'Invalid password or corrupted file data. Please double-check your password and ensure the file is correct.' 
    }, { status: 400 });
  }
});