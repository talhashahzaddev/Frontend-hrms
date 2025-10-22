// import { Component, OnInit } from '@angular/core';
// import { PerformanceService } from '../../services/performance.service';
// import { SkillSet } from '../../../../core/models/performance.models';

// import { CommonModule } from '@angular/common';

// @Component({
//   selector: 'app-skill-matrix',
//   imports: [CommonModule],
//   templateUrl: './skill-matrix.component.html',
//   styleUrl: './skill-matrix.component.scss'
// })
// export class SkillMatrixComponent implements OnInit {
//   skills: SkillSet[] = [];
//   groupedSkills: { [category: string]: SkillSet[] } = {};
//   loading = true;

//   constructor(private performanceService: PerformanceService) {}

//   ngOnInit() {
//     this.performanceService.getSkillsMatrix().subscribe(res => {
//       this.skills = (res.data || []).map((skill: any) => ({
//         skillId: skill.skillId,
//         skillName: skill.skillName,
//         category: skill.category,
//         description: skill.description,
//         skillLevelScale: skill.skillLevelScale,
//         isActive: skill.isActive,
//         createdAt: skill.createdAt
//       }));
//       this.groupedSkills = this.groupByCategory(this.skills);
//       this.loading = false;
//     });
//   }

//   groupByCategory(skills: SkillSet[]): { [category: string]: SkillSet[] } {
//     return skills.reduce((acc, skill) => {
//       if (!acc[skill.category]) acc[skill.category] = [];
//       acc[skill.category].push(skill);
//       return acc;
//     }, {} as { [category: string]: SkillSet[] });
//   }
// }

import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { PerformanceService } from '../../services/performance.service';
import { FormsModule } from '@angular/forms';
import { CreateSkillSetRequest, SkillSet } from 'src/app/core/models/performance.models';
@Component({
  selector: 'app-skill-matrix',
  imports: [CommonModule, FormsModule], // <-- Add FormsModule here
  templateUrl: './skill-matrix.component.html',
  styleUrl: './skill-matrix.component.scss'
})
export class SkillMatrixComponent implements OnInit {
  skills: SkillSet[] = [];
  groupedSkills: { [category: string]: SkillSet[] } = {};
  loading = true;

  constructor(private performanceService: PerformanceService) {}

  ngOnInit() {
  this.performanceService.getSkillsMatrix().subscribe(res => {
    this.skills = (res.data || []).map((skill: any) => ({
      skillId: skill.skillId,
      skillName: skill.skillName,
      category: skill.category,
      description: skill.description,
      skillLevelScale: skill.skillLevelScale,
      isActive: skill.isActive,
      createdAt: skill.createdAt
    }));
    this.groupedSkills = this.groupByCategory(this.skills); // <-- Add this line
    this.loading = false; // <-- Add this line
  });
}

  groupByCategory(skills: SkillSet[]): { [category: string]: SkillSet[] } {
    return skills.reduce((groups, skill) => {
      const category = skill.category || 'Uncategorized';
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(skill);
      return groups;
    }, {} as { [category: string]: SkillSet[] });
  }
  newSkill: CreateSkillSetRequest = {
  skillName: '',
  category: '',
  description: '',
  skillLevelScale: [],
  isActive: true
};
skillLevelScaleInput: string = '';

onCreateSkill() {
  // Convert comma-separated string to number array
  this.newSkill.skillLevelScale = this.skillLevelScaleInput
    .split(',')
    .map(s => parseInt(s.trim(), 10))
    .filter(n => !isNaN(n));

  this.performanceService.createSkillSet(this.newSkill).subscribe(res => {
    if (res.success && res.data) {
      // Add new skill to local list and regroup
      this.skills.push(res.data);
      this.groupedSkills = this.groupByCategory(this.skills);
      // Reset form
      this.newSkill = {
        skillName: '',
        category: '',
        description: '',
        skillLevelScale: [],
        isActive: true
      };
      this.skillLevelScaleInput = '';
    }
  });
}
}