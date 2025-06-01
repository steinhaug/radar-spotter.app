1. Open powershell 
New-SelfSignedCertificate -DnsName "localhost" -CertStoreLocation "cert:\LocalMachine\My"

2. 
Type Certificate into the Windows search bar, click the Manage Computer Certificates control panel item that is suggested.
From the Certificate Management program that comes up (certlm), you should now see a localhost key under Personal >> Certificates.
Copied this certificate into Trusted Root Certification Authorities.

3. export sertificate
Selecting the newly copied certificate, double click on it (the localhost certificate). From the Certificate modal, click the Details tab, then the Copy to File... button.
This will bring up and Export Wizard, I chose to export the private key, click next. I also chose to Export all extended properties (again, I'm not certain if that was necessary). I chose to use a simple password (pass) and the default encryption. Choose a folder to export to and name the file. You can always move and rename the file if necessary. For simplicity's sake let's copy it to your conf folder under your Apache installation (In my case: C:\apache\conf) and name the file myCert (the resulting file will be a .pfx file)

Step 4 - Convert .pfx file for use with Apache

    openssl pkcs12 -in myCert.pfx -nocerts -out privateKey.pem

Step 5

    openssl rsa -in privateKey.pem -out private.pem

Step 6

    openssl pkcs12 -in myCert.pfx -clcerts -nokeys -out EntrustCert.pem

Step 7 - configure chost

<VirtualHost *:443>
     # example
     DocumentRoot "E:/htdocs/xr-arbeidsflyt.local/www"
     ServerName xr-arbeidsflyt.no
     SSLEngine on
     SSLCertificateFile "${SRVROOT}/crt/xr-arbeidsflyt.local/EntrustCert.pem"
     SSLCertificateKeyFile "${SRVROOT}/crt/xr-arbeidsflyt.local/private.pem"
</VirtualHost>


* * * * * *
* * * * * *

// 2022 quick list

1. Open powershell:
    New-SelfSignedCertificate -DnsName "localhost" -CertStoreLocation "cert:\LocalMachine\My"
2. "Certificate" in win search, find certificate under "personlige certificates" double click and export it to cert folder
3. open bash in dir for the certificates:
    openssl pkcs12 -in myCert2022.pfx -nocerts -out privateKey2022.pem
    openssl rsa -in privateKey2022.pem -out private2022.pem
    openssl pkcs12 -in myCert2022.pfx -clcerts -nokeys -out EntrustCert2022.pem

* * * * *

// xr-arbeidsflyt.local
New-SelfSignedCertificate -DnsName "xr-arbeidsflyt.local" -CertStoreLocation "cert:\LocalMachine\My"
openssl pkcs12 -in myCert.pfx -nocerts -out privateKey.pem
openssl rsa -in privateKey.pem -out private.pem
openssl pkcs12 -in myCert.pfx -clcerts -nokeys -out EntrustCert.pem

cd C:\Apache24\crt\xr-arbeidsflyt.local

<VirtualHost *:443>
     SSLEngine on
     SSLCertificateFile "${SRVROOT}/crt/xr-arbeidsflyt.local/EntrustCert.pem"
     SSLCertificateKeyFile "${SRVROOT}/crt/xr-arbeidsflyt.local/private.pem"
</VirtualHost>
