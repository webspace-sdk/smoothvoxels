const clamp = (num, min, max) => Math.min(Math.max(num, min), max)

/* Note, the Color class only supports hexadecimal colors like #FFF or #FFFFFF. */
/*       Its r, g and b members are stored as floats between 0 and 1.           */

export default class Color {
  static fromHex (hex) {
    const color = new Color()
    color._set(hex)

    color.id = ''
    color.exId = null // Used for MagicaVoxel color index
    color.count = 0

    return color
  }

  // r, g, b from 0 to 1 !!
  static fromRgb (r, g, b) {
    r = Math.round(clamp(r, 0, 1) * 255)
    g = Math.round(clamp(g, 0, 1) * 255)
    b = Math.round(clamp(b, 0, 1) * 255)
    const color = '#' +
                (r < 16 ? '0' : '') + r.toString(16) +
                (g < 16 ? '0' : '') + g.toString(16) +
                (b < 16 ? '0' : '') + b.toString(16)
    return Color.fromHex(color)
  }

  clone () {
    const clone = new Color()
    clone._color = this._color
    clone.r = this.r
    clone.g = this.g
    clone.b = this.b
    clone._material = this._material
    return clone
  }

  multiply (factor) {
    if (factor instanceof Color) { return Color.fromRgb(this.r * factor.r, this.g * factor.g, this.b * factor.b) } else { return Color.fromRgb(this.r * factor, this.g * factor, this.b * factor) }
  }

  normalize () {
    const d = Math.sqrt(this.r * this.r + this.g * this.g + this.b * this.b)
    return this.multiply(1 / d)
  }

  add (...colors) {
    const r = this.r + colors.reduce((sum, color) => sum + color.r, 0)
    const g = this.g + colors.reduce((sum, color) => sum + color.g, 0)
    const b = this.b + colors.reduce((sum, color) => sum + color.b, 0)
    return Color.fromRgb(r, g, b)
  }

  _setMaterial (material) {
    if (this._material !== undefined) { throw new Error('A Color can only be added once.') }

    this._material = material
    this.count = 0
  }

  get material () {
    return this._material
  }

  _set (colorValue) {
    let color = colorValue
    if (typeof color === 'string' || color instanceof String) {
      color = color.trim().toUpperCase()
      if (color.match(/^#([0-9a-fA-F]{3}|#?[0-9a-fA-F]{6})$/)) {
        color = color.replace('#', '')

        this._color = '#' + color

        if (color.length === 3) {
          color = color[0] + color[0] + color[1] + color[1] + color[2] + color[2]
        }

        // Populate .r .g and .b
        const value = parseInt(color, 16)
        this.r = ((value >> 16) & 255) / 255
        this.g = ((value >> 8) & 255) / 255
        this.b = (value & 255) / 255

        return
      }
    }

    throw new Error(`SyntaxError: Color ${colorValue} is not a hexadecimal color of the form #000 or #000000.`)
  }

  toString () {
    return this._color
  }
}
