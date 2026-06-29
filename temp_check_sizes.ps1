$printers = Get-Printer
$results = @()
foreach ($p in $printers) {
    $sizes = @()
    try {
        $config = Get-PrintConfiguration -PrinterName $p.Name -ErrorAction SilentlyContinue
        if ($config.PrintCapabilitiesXML) {
            [xml]$xml = $config.PrintCapabilitiesXML
            $ns = new-object Xml.XmlNamespaceManager $xml.NameTable
            $ns.AddNamespace("psf", "http://schemas.microsoft.com/windows/2003/08/printing/printschemaframework")
            $nodes = $xml.SelectNodes("//psf:Feature[@name='psk:PageMediaSize']/psf:Option", $ns)
            foreach ($node in $nodes) {
                $sizes += $node.name.Replace("psk:", "").Replace("ns0001:", "")
            }
        }
    } catch {}
    $results += @{ Name = $p.Name; SupportedSizes = $sizes }
}
$results | ConvertTo-Json -Depth 3
