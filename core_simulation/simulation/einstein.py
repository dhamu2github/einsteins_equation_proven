from typing import Dict, Any

class EinsteinCalculator:
    def __init__(self):
        self.c = 299_792_458  # speed of light in m/s

    def calculate_energy(self, mass_grams: float) -> Dict[str, Any]:
        """
        Calculate energy using Einstein's E=mc² equation
        
        Args:
            mass_grams: Mass in grams
            
        Returns:
            Dictionary containing energy in joules and scientific notation
        """
        # Convert grams to kilograms
        mass_kg = mass_grams / 1000.0
        
        # Calculate E = mc²
        energy_joules = mass_kg * (self.c ** 2)
        
        return {
            'energy_joules': energy_joules,
            'energy_scientific': f"{energy_joules:.2e}",
            'mass_kg': mass_kg,
            'mass_grams': mass_grams
        } 