function mergePrintOptions(options) {
  const printOptionsKeys = [
    'printer', 'pages', 'subset',
    'orientation', 'scale', 'monochrome',
    'side', 'bin', 'paperSize',
    'silent', 'printDialog', 'copies'
  ]
  const printOptions = {}
  printOptionsKeys.forEach(key => {
    if (options[key]) {
      printOptions[key] = options[key]
    }
  })
  return printOptions
}

module.exports = {
  mergePrintOptions
}
