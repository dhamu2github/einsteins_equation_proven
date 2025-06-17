import numpy as np
from dataclasses import dataclass
from typing import List, Dict, Any

@dataclass
class Particle:
    x: float
    y: float
    vx: float
    vy: float
    is_vapor: bool = False
    is_condensed: bool = False
    condensation_time: float = 0.0

    def to_dict(self) -> Dict[str, Any]:
        return {
            'x': float(self.x),
            'y': float(self.y),
            'vx': float(self.vx),
            'vy': float(self.vy),
            'is_vapor': self.is_vapor,
            'is_condensed': self.is_condensed
        }

class BoilingSimulation:
    def __init__(self, 
                 num_particles: int = 100,
                 width: int = 800,
                 height: int = 400):
        self.width = width
        self.height = height
        self.temperature = 25.0  # Starting temperature in Celsius
        self.is_heating = False
        self.particles = self._initialize_particles(num_particles)
        self.boiling_point = 100.0  # Water boiling point in Celsius
        
        # Condenser properties
        self.condenser_angle = np.pi / 6  # 30 degrees
        self.condenser_length = width * 0.4
        self.condenser_start_x = width * 0.3
        self.condenser_start_y = height * 0.2
        self.collected_water = 0  # Track amount of condensed water
        
    def _initialize_particles(self, num_particles: int) -> List[Particle]:
        particles = []
        # Calculate main vessel dimensions
        vessel_width = self.width/3 - 50
        vessel_x = 50
        vessel_y = self.height/2 - 100
        vessel_height = 200
        
        for _ in range(num_particles):
            x = np.random.uniform(vessel_x + 10, vessel_x + vessel_width - 10)
            y = np.random.uniform(vessel_y + vessel_height/2, vessel_y + vessel_height - 10)
            vx = np.random.normal(0, 1)
            vy = np.random.normal(0, 1)
            particles.append(Particle(x, y, vx, vy))
        return particles

    def _check_condenser_collision(self, x: float, y: float) -> bool:
        # Convert point to condenser's coordinate system
        rel_x = x - self.condenser_start_x
        rel_y = y - self.condenser_start_y
        
        # Rotate point by -angle to align with condenser
        cos_a = np.cos(-self.condenser_angle)
        sin_a = np.sin(-self.condenser_angle)
        rot_x = rel_x * cos_a - rel_y * sin_a
        rot_y = rel_x * sin_a + rel_y * cos_a
        
        # Check if point is on condenser surface
        return (0 <= rot_x <= self.condenser_length and 
                -5 <= rot_y <= 0)

    def update(self) -> None:
        speed_multiplier = self.temperature / 50.0
        gravity = 0.1  # Add gravity effect
        
        for particle in self.particles:
            if particle.is_condensed:
                # Condensed particles flow down the condenser
                particle.vy += gravity
                particle.vx = -np.sin(self.condenser_angle) * gravity * 2
                particle.condensation_time += 1
                
                # Reset particle if it reaches bottom of condenser
                if particle.condensation_time > 100:
                    particle.is_condensed = False
                    particle.is_vapor = False
                    particle.x = self.width * 0.7  # Collection vessel position
                    particle.y = self.height * 0.3
                    particle.condensation_time = 0
                    self.collected_water += 1
            else:
                # Update velocity for vapor particles
                if particle.is_vapor:
                    particle.vy -= 0.05  # Vapor rises
                    particle.vx += np.random.normal(0, 0.1)  # Random horizontal motion
                
                # Update position
                particle.x += particle.vx * speed_multiplier
                particle.y += particle.vy * speed_multiplier
                
                # Boundary checking
                if particle.x < 50:
                    particle.x = 50
                    particle.vx *= -1
                elif particle.x > self.width - 50:
                    particle.x = self.width - 50
                    particle.vx *= -1
                
                if particle.y < 50:
                    particle.y = 50
                    particle.vy *= -1
                elif particle.y > self.height - 50:
                    particle.y = self.height - 50
                    particle.vy *= -1
                
                # State change based on temperature
                particle.is_vapor = self.temperature >= self.boiling_point
                
                # Check for condensation
                if (particle.is_vapor and 
                    self._check_condenser_collision(particle.x, particle.y)):
                    particle.is_vapor = False
                    particle.is_condensed = True
                    particle.condensation_time = 0

    def toggle_heating(self) -> None:
        self.is_heating = not self.is_heating

    def set_temperature(self, temperature: float) -> None:
        self.temperature = max(0, min(150, temperature))
        self.update()

    def get_particles_state(self) -> Dict[str, Any]:
        return {
            'temperature': self.temperature,
            'is_heating': self.is_heating,
            'particles': [p.to_dict() for p in self.particles],
            'condenser': {
                'start_x': self.condenser_start_x,
                'start_y': self.condenser_start_y,
                'length': self.condenser_length,
                'angle': self.condenser_angle
            },
            'collected_water': self.collected_water
        } 