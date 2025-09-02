import { Logger } from '@nestjs/common';
import { EventEmitter } from 'events';
import { PlcDriver } from '../interfaces/plc-driver.interface';

export class MockPlcDriver extends EventEmitter implements PlcDriver {
  private readonly logger = new Logger(MockPlcDriver.name);
  private tags = new Map<string, any>();
  private connected = false;
  private simulationInterval: NodeJS.Timer;
  private connectionTime: Date;

  constructor() {
    super();
    this.initializeMockTags();
  }

  async connect(): Promise<void> {
    this.logger.log('Connecting to Mock PLC...');
    
    // Simulate connection delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    this.connected = true;
    this.connectionTime = new Date();
    this.startSimulation();
    
    this.logger.log('✅ Mock PLC connected successfully');
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
    }
    this.logger.log('Mock PLC disconnected');
  }

  async readTag(tag: string): Promise<any> {
    if (!this.connected) {
      throw new Error('PLC not connected');
    }
    
    const value = this.tags.get(tag);
    if (value === undefined) {
      throw new Error(`Tag ${tag} not found`);
    }
    
    return value;
  }

  async writeTag(tag: string, value: any): Promise<void> {
    if (!this.connected) {
      throw new Error('PLC not connected');
    }
    
    this.logger.log(`Writing tag: ${tag} = ${value}`);
    this.tags.set(tag, value);
    this.emit('tag_changed', tag, value);
  }

  isConnected(): boolean {
    return this.connected;
  }

  getStatus() {
    return {
      connected: this.connected,
      connectionTime: this.connectionTime,
    };
  }

  private initializeMockTags() {
    // Line control tags
    this.tags.set('Line.State', 1); // 0=Stopped, 1=Running, 2=Paused, 3=Fault
    this.tags.set('Line.RunCmd', false);
    this.tags.set('Line.Stop', false);
    this.tags.set('Line.Reset', false);
    
    // Station data
    this.tags.set('Station01.CycleTimeMs', 850);
    this.tags.set('Station02.CycleTimeMs', 920);
    this.tags.set('Station01.PartPresent', false);
    this.tags.set('Station02.PartPresent', false);
    
    // Production counters
    this.tags.set('Part.Counter', 0);
    this.tags.set('Part.Completed', false);
    this.tags.set('Quality.PassCount', 0);
    this.tags.set('Quality.FailCount', 0);
    this.tags.set('Quality.LastResult', 'pass');
    
    // Process parameters
    this.tags.set('Process.Temperature', 22.5);
    this.tags.set('Process.Pressure', 6.2);
    this.tags.set('Process.Humidity', 45.0);
    
    // Safety and alarms
    this.tags.set('Safety.LightCurtain', true);
    this.tags.set('Safety.EmergencyStop', false);
    this.tags.set('Alarm.Active', false);
    this.tags.set('Alarm.Count', 0);
  }

  private startSimulation() {
    this.logger.log('Starting PLC simulation...');
    
    this.simulationInterval = setInterval(() => {
      this.simulateProductionCycle();
      this.simulateProcessVariables();
      this.simulateRandomEvents();
    }, 1000);
  }

  private simulateProductionCycle() {
    if (this.tags.get('Line.State') === 1) { // Running
      // Increment part counter
      const counter = this.tags.get('Part.Counter');
      this.tags.set('Part.Counter', counter + 1);
      this.emit('tag_changed', 'Part.Counter', counter + 1);
      
      // Simulate part completion every 3-5 seconds
      if (counter % Math.floor(Math.random() * 3 + 3) === 0) {
        this.tags.set('Part.Completed', true);
        this.emit('tag_changed', 'Part.Completed', true);
        
        // Random quality result
        const isPass = Math.random() > (parseFloat(process.env.DEMO_DEFECT_RATE) || 0.05);
        const result = isPass ? 'pass' : 'fail';
        
        this.tags.set('Quality.LastResult', result);
        this.emit('tag_changed', 'Quality.LastResult', result);
        
        if (isPass) {
          const passCount = this.tags.get('Quality.PassCount');
          this.tags.set('Quality.PassCount', passCount + 1);
          this.emit('tag_changed', 'Quality.PassCount', passCount + 1);
        } else {
          const failCount = this.tags.get('Quality.FailCount');
          this.tags.set('Quality.FailCount', failCount + 1);
          this.emit('tag_changed', 'Quality.FailCount', failCount + 1);
        }
        
        // Reset completion flag after brief delay
        setTimeout(() => {
          this.tags.set('Part.Completed', false);
          this.emit('tag_changed', 'Part.Completed', false);
        }, 100);
      }
      
      // Vary cycle times slightly
      const baseCycle = parseInt(process.env.DEMO_CYCLE_TIME) || 850;
      const variation = Math.floor(Math.random() * 100 - 50); // ±50ms
      this.tags.set('Station01.CycleTimeMs', baseCycle + variation);
      this.emit('tag_changed', 'Station01.CycleTimeMs', baseCycle + variation);
    }
  }

  private simulateProcessVariables() {
    // Temperature drift
    const temp = this.tags.get('Process.Temperature');
    const newTemp = temp + (Math.random() - 0.5) * 0.5;
    this.tags.set('Process.Temperature', Math.round(newTemp * 10) / 10);
    this.emit('tag_changed', 'Process.Temperature', Math.round(newTemp * 10) / 10);
    
    // Pressure fluctuation
    const pressure = this.tags.get('Process.Pressure');
    const newPressure = pressure + (Math.random() - 0.5) * 0.2;
    this.tags.set('Process.Pressure', Math.round(newPressure * 10) / 10);
    this.emit('tag_changed', 'Process.Pressure', Math.round(newPressure * 10) / 10);
    
    // Humidity changes
    const humidity = this.tags.get('Process.Humidity');
    const newHumidity = Math.max(30, Math.min(60, humidity + (Math.random() - 0.5) * 2));
    this.tags.set('Process.Humidity', Math.round(newHumidity * 10) / 10);
    this.emit('tag_changed', 'Process.Humidity', Math.round(newHumidity * 10) / 10);
  }

  private simulateRandomEvents() {
    const faultRate = parseFloat(process.env.DEMO_FAULT_RATE) || 0.02;
    
    // Random faults/alarms
    if (Math.random() < faultRate / 100) {
      const faultCodes = ['F103', 'F205', 'F301', 'W102', 'W204'];
      const severities = ['medium', 'high', 'critical'];
      const messages = [
        'Part present timeout',
        'Vision system communication error',
        'Pneumatic pressure low',
        'Cycle time exceeded',
        'Quality gate failure'
      ];
      
      const randomIndex = Math.floor(Math.random() * faultCodes.length);
      
      this.tags.set('Line.State', 3); // Fault state
      this.emit('tag_changed', 'Line.State', 3);
      
      this.tags.set('Alarm.Active', true);
      this.emit('tag_changed', 'Alarm.Active', true);
      
      const alarmCount = this.tags.get('Alarm.Count');
      this.tags.set('Alarm.Count', alarmCount + 1);
      this.emit('tag_changed', 'Alarm.Count', alarmCount + 1);
      
      // Emit alarm event
      this.emit('alarm', {
        code: faultCodes[randomIndex],
        severity: severities[Math.floor(Math.random() * severities.length)],
        message: messages[randomIndex],
        station: Math.floor(Math.random() * 2) + 1,
        context: {
          cycleTime: this.tags.get('Station01.CycleTimeMs'),
          temperature: this.tags.get('Process.Temperature'),
          pressure: this.tags.get('Process.Pressure')
        }
      });
      
      // Auto-clear alarm after 5-15 seconds
      setTimeout(() => {
        this.tags.set('Line.State', 1); // Back to running
        this.emit('tag_changed', 'Line.State', 1);
        
        this.tags.set('Alarm.Active', false);
        this.emit('tag_changed', 'Alarm.Active', false);
      }, Math.random() * 10000 + 5000);
    }
    
    // Simulate part presence sensors
    if (Math.random() < 0.1) {
      const station1Present = Math.random() < 0.3;
      const station2Present = Math.random() < 0.3;
      
      this.tags.set('Station01.PartPresent', station1Present);
      this.emit('tag_changed', 'Station01.PartPresent', station1Present);
      
      this.tags.set('Station02.PartPresent', station2Present);
      this.emit('tag_changed', 'Station02.PartPresent', station2Present);
    }
  }
}