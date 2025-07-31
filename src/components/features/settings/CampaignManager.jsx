import React, { useState, useEffect } from 'react';
import { getCampaigns, addCampaign, updateCampaign, deleteCampaign } from '../../../api/firestore';
import Input from '../../ui/Input';
import Button from '../../ui/Button';
import { DollarSign, Trash2, Edit, PlusCircle, Users } from 'lucide-react';
import toast from 'react-hot-toast';

const CampaignManager = () => {
    const [campaigns, setCampaigns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingCampaign, setEditingCampaign] = useState(null);

    const initialFormState = {
        name: '',
        platform: '',
        budget: '',
        startDate: '',
        endDate: '',
        leadsGenerated: '',
    };
    const [formData, setFormData] = useState(initialFormState);

    const fetchCampaigns = async () => {
        setLoading(true);
        try {
            const fetchedCampaigns = await getCampaigns();
            setCampaigns(fetchedCampaigns);
        } catch (error) {
            console.error("Error fetching campaigns:", error);
            toast.error("Could not load campaign data.");
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchCampaigns();
    }, []);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleEditClick = (campaign) => {
        setEditingCampaign(campaign);
        setFormData({
            name: campaign.name,
            platform: campaign.platform,
            budget: campaign.budget,
            startDate: campaign.startDate?.toDate ? campaign.startDate.toDate().toISOString().split('T')[0] : '',
            endDate: campaign.endDate?.toDate ? campaign.endDate.toDate().toISOString().split('T')[0] : '',
            leadsGenerated: campaign.leadsGenerated || 0,
        });
    };

    const handleCancelEdit = () => {
        setEditingCampaign(null);
        setFormData(initialFormState);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name || !formData.platform || !formData.budget || !formData.startDate) {
            toast.error("Please fill in name, platform, budget, and start date.");
            return;
        }

        const dataToSave = {
            name: formData.name,
            platform: formData.platform,
            budget: parseFloat(formData.budget),
            startDate: new Date(formData.startDate),
            endDate: formData.endDate ? new Date(formData.endDate) : null,
            leadsGenerated: Number(formData.leadsGenerated) || 0,
        };

        try {
            if (editingCampaign) {
                await updateCampaign(editingCampaign.id, dataToSave);
                toast.success("Campaign updated successfully!");
            } else {
                await addCampaign(dataToSave);
                toast.success("Campaign added successfully!");
            }
            handleCancelEdit();
            fetchCampaigns();
        } catch (error) {
            console.error("Error saving campaign:", error);
            toast.error("Failed to save campaign.");
        }
    };

    const handleDeleteClick = (campaignId) => {
        toast((t) => (
            <span>
                Are you sure you want to delete this campaign?
                <Button variant="danger" size="sm" className="ml-2" onClick={() => {
                    deleteCampaign(campaignId)
                        .then(() => {
                            toast.success("Campaign deleted.");
                            fetchCampaigns();
                        })
                        .catch(err => {
                            console.error("Error deleting campaign:", err);
                            toast.error("Failed to delete campaign.");
                        });
                    toast.dismiss(t.id);
                }}>
                    Delete
                </Button>
                <Button variant="secondary" size="sm" className="ml-2" onClick={() => toast.dismiss(t.id)}>
                    Cancel
                </Button>
            </span>
        ), {
            icon: 'âš ï¸ ',
        });
    };

    const formatDate = (timestamp) => {
        if (!timestamp?.toDate) return 'N/A';
        return timestamp.toDate().toLocaleDateString('en-ZA');
    };

    return (
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
            <h3 className="text-xl font-bold text-white mb-4">Manage Marketing Campaigns</h3>
            
            <form onSubmit={handleSubmit} className="p-4 mb-6 bg-gray-900/50 rounded-lg space-y-4">
                <h4 className="text-lg font-semibold text-white">{editingCampaign ? 'Edit Campaign' : 'Add New Campaign'}</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Input label="Campaign Name" name="name" value={formData.name} onChange={handleInputChange} placeholder="e.g., Winter Sale 2025" />
                    <Input label="Platform" name="platform" value={formData.platform} onChange={handleInputChange} placeholder="e.g., Facebook, Google Ads" />
                    <Input label="Budget (R)" name="budget" type="number" value={formData.budget} onChange={handleInputChange} placeholder="e.g., 5000" />
                    <Input label="Leads Generated" name="leadsGenerated" type="number" value={formData.leadsGenerated} onChange={handleInputChange} placeholder="e.g., 25" />
                    <Input label="Start Date" name="startDate" type="date" value={formData.startDate} onChange={handleInputChange} />
                    <Input label="End Date (Optional)" name="endDate" type="date" value={formData.endDate} onChange={handleInputChange} />
                </div>
                <div className="flex justify-end gap-2">
                    {editingCampaign && <Button type="button" variant="secondary" onClick={handleCancelEdit}>Cancel</Button>}
                    <Button type="submit" variant="primary">
                        {editingCampaign ? <><Edit size={16} className="mr-2"/>Save Changes</> : <><PlusCircle size={16} className="mr-2"/>Add Campaign</>}
                    </Button>
                </div>
            </form>

            <div className="space-y-3">
                {loading ? <p className="text-gray-400">Loading...</p> :
                    campaigns.map(campaign => (
                        <div key={campaign.id} className="bg-gray-700 p-4 rounded-lg flex flex-wrap items-center justify-between gap-4">
                            <div>
                                <p className="font-bold text-white">{campaign.name}</p>
                                <p className="text-sm text-gray-400">{campaign.platform}</p>
                            </div>
                            <div className="flex items-center gap-6">
                                <div className="text-center">
                                    <p className="text-xs text-gray-400">Leads</p>
                                    <p className="font-semibold text-blue-400">{campaign.leadsGenerated || 0}</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-xs text-gray-400">Budget</p>
                                    <p className="font-semibold text-green-400">R{campaign.budget.toFixed(2)}</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-xs text-gray-400">Date</p>
                                    <p className="text-sm text-gray-300">{formatDate(campaign.startDate)} - {formatDate(campaign.endDate)}</p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button onClick={() => handleEditClick(campaign)} variant="secondary" size="sm" className="p-2"><Edit size={16}/></Button>
                                <Button onClick={() => handleDeleteClick(campaign.id)} variant="danger" size="sm" className="p-2"><Trash2 size={16}/></Button>
                            </div>
                        </div>
                    ))
                }
            </div>
        </div>
    );
};

export default CampaignManager;