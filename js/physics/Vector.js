/**
 * 2D Vector class for physics calculations
 */

class Vector {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }
    
    /**
     * Create a copy of this vector
     */
    clone() {
        return new Vector(this.x, this.y);
    }
    
    /**
     * Set vector components
     */
    set(x, y) {
        this.x = x;
        this.y = y;
        return this;
    }
    
    /**
     * Add another vector
     */
    add(v) {
        this.x += v.x;
        this.y += v.y;
        return this;
    }
    
    /**
     * Subtract another vector
     */
    subtract(v) {
        this.x -= v.x;
        this.y -= v.y;
        return this;
    }
    
    /**
     * Multiply by scalar
     */
    multiply(scalar) {
        this.x *= scalar;
        this.y *= scalar;
        return this;
    }
    
    /**
     * Get magnitude (length)
     */
    magnitude() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }
    
    /**
     * Get squared magnitude (faster, no sqrt)
     */
    magnitudeSquared() {
        return this.x * this.x + this.y * this.y;
    }
    
    /**
     * Normalize to unit vector
     */
    normalize() {
        const mag = this.magnitude();
        if (mag > 0) {
            this.x /= mag;
            this.y /= mag;
        }
        return this;
    }
    
    /**
     * Dot product with another vector
     */
    dot(v) {
        return this.x * v.x + this.y * v.y;
    }
    
    /**
     * Reflect this vector off a surface with given normal
     */
    reflect(normal) {
        const dot = this.dot(normal);
        this.x -= 2 * dot * normal.x;
        this.y -= 2 * dot * normal.y;
        return this;
    }
    
    /**
     * Limit magnitude to max value
     */
    limit(max) {
        const magSq = this.magnitudeSquared();
        if (magSq > max * max) {
            this.normalize().multiply(max);
        }
        return this;
    }
    
    // Static methods
    
    /**
     * Add two vectors, return new vector
     */
    static add(v1, v2) {
        return new Vector(v1.x + v2.x, v1.y + v2.y);
    }
    
    /**
     * Subtract v2 from v1, return new vector
     */
    static subtract(v1, v2) {
        return new Vector(v1.x - v2.x, v1.y - v2.y);
    }
    
    /**
     * Multiply vector by scalar, return new vector
     */
    static multiply(v, scalar) {
        return new Vector(v.x * scalar, v.y * scalar);
    }
    
    /**
     * Get distance between two vectors
     */
    static distance(v1, v2) {
        const dx = v2.x - v1.x;
        const dy = v2.y - v1.y;
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    /**
     * Create unit vector from angle (radians)
     */
    static fromAngle(angle) {
        return new Vector(Math.cos(angle), Math.sin(angle));
    }
}
