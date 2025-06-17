from flask import Flask, render_template
from flask_socketio import SocketIO, emit
import numpy as np
from simulation.boiling import BoilingSimulation
from simulation.einstein import EinsteinCalculator
import json
import os
from dotenv import load_dotenv
import threading
import time

load_dotenv()

app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev_key_123')
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading')

# Initialize simulations
boiling_sim = BoilingSimulation()
einstein_calc = EinsteinCalculator()

# Background task for continuous updates
def background_simulation():
    while True:
        if boiling_sim.is_heating:
            boiling_sim.update()  # Just update the simulation state
            socketio.emit('simulation_update', boiling_sim.get_particles_state())
        time.sleep(0.05)  # 50ms delay between updates

@app.route('/')
def index():
    return render_template('index.html')

@socketio.on('connect')
def handle_connect():
    print('Client connected')

@socketio.on('start_heating')
def handle_start_heating():
    boiling_sim.toggle_heating()
    emit('heating_status', {'is_heating': boiling_sim.is_heating})

@socketio.on('update_temperature')
def handle_temperature_update(data):
    try:
        temperature = float(data['temperature'])
        # Ensure temperature is within valid range
        temperature = max(25, min(150, temperature))
        boiling_sim.set_temperature(temperature)
        particles_data = boiling_sim.get_particles_state()
        emit('simulation_update', particles_data)
    except (ValueError, KeyError) as e:
        print(f"Error updating temperature: {e}")
        # Send error status back to client
        emit('error', {'message': 'Invalid temperature value'})

@socketio.on('calculate_energy')
def handle_energy_calculation(data):
    mass = float(data['mass'])
    energy = einstein_calc.calculate_energy(mass)
    emit('energy_result', {
        'energy': energy,
        'mass': mass,
        'units': 'joules'
    })

if __name__ == '__main__':
    # Start the background simulation thread
    simulation_thread = threading.Thread(target=background_simulation, daemon=True)
    simulation_thread.start()
    socketio.run(app, debug=True, port=5000) 