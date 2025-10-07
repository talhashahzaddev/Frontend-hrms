import { Component, OnInit } from '@angular/core';
import { PerformanceService } from '../../services/performance.service';
import { SkillSet } from '../../../../core/models/performance.models';

import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-skill-matrix',
  imports: [CommonModule],
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
      this.groupedSkills = this.groupByCategory(this.skills);
      this.loading = false;
    });
  }

  groupByCategory(skills: SkillSet[]): { [category: string]: SkillSet[] } {
    return skills.reduce((acc, skill) => {
      if (!acc[skill.category]) acc[skill.category] = [];
      acc[skill.category].push(skill);
      return acc;
    }, {} as { [category: string]: SkillSet[] });
  }
}